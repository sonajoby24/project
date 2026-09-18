"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import ProcurementDashboard from "./ProcurementDashboard";

interface Message {
  role: "user" | "assistant";
  content?: string;
  type?: "text" | "report";
  reportData?: any;
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `
# 👋 Welcome to Catalogix!

I'm your **AI Procurement Assistant**.

I can help you with:

- Search Products
- Compare Vendors
- Generate Procurement Reports
- View Product Specifications
- Analyze Quotes
- Retrieve information from the Catalogix database

**How can I help you today?**
`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /*
   * Detect whether the user is asking for a report.
   *
   * This is intentionally flexible.
   *
   * Examples:
   *
   * "generate report for quote 00000080"
   * "get me a report for quote 00000080"
   * "give me the report for 00000080"
   * "show procurement report for 00000080"
   * "I need a quote report for 00000080"
   */

  function isReportRequest(text: string): boolean {
    const message = text.toLowerCase().trim();

    const reportKeywords = [
      "report",
      "procurement report",
      "quote report",
      "comparison report",
      "procurement analysis",
    ];

    return reportKeywords.some((keyword) =>
      message.includes(keyword)
    );
  }

  /*
   * Extract either:
   *
   * Salesforce-style Quote ID
   * 0Q0hg0000003SqzCAE
   *
   * OR
   *
   * Quote Number
   * 00000080
   */

  function extractQuoteReference(text: string) {
    const quoteIdMatch = text.match(
      /0Q0[a-zA-Z0-9]+/i
    );

    const quoteNumberMatch = text.match(
      /\b\d{6,}\b/
    );

    return {
      quoteId: quoteIdMatch
        ? quoteIdMatch[0]
        : "",

      quoteNumber: quoteNumberMatch
        ? quoteNumberMatch[0]
        : "",
    };
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userInput = input.trim();

    const userMessage: Message = {
      role: "user",
      content: userInput,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      /*
       * ==========================================================
       * REPORT REQUEST
       * ==========================================================
       */

      const wantsReport =
        isReportRequest(userInput);

      const {
        quoteId,
        quoteNumber,
      } = extractQuoteReference(userInput);

      /*
       * If the user asks for a report and provides
       * either a Quote ID or Quote Number,
       * use the dedicated report API.
       */

      if (
        wantsReport &&
        (quoteId || quoteNumber)
      ) {
        const reportResponse = await fetch(
          "/api/report",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              quoteId,
              quoteNumber,
            }),
          }
        );

        const reportData =
          await reportResponse.json();

        if (reportData.success) {
          setMessages([
            ...updatedMessages,
            {
              role: "assistant",

              type: "report",

              reportData:
                reportData.report,

              content: `
# Report Generated

**Quote Number:** ${
                reportData.report.quoteNumber ||
                quoteNumber ||
                "N/A"
              }

**Quote Type:** ${
                reportData.report.quoteType ||
                "N/A"
              }

**Vendor:** ${
  reportData.report.selectedVendor ??
  reportData.report.vendor ??
  reportData.report.vendorName ??
  "N/A"
}

The procurement report has been generated successfully.
`,
            },
          ]);

          return;
        }

        setMessages([
          ...updatedMessages,
          {
            role: "assistant",

            content:
              reportData.message ||
              "Quote not found.",
          },
        ]);

        return;
      }

      /*
       * ==========================================================
       * NORMAL CHAT
       * ==========================================================
       */

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: userInput,
            history: messages,
          }),
        }
      );

      const data =
        await response.json();

      const safeContent =
        typeof data.response ===
        "object"
          ? JSON.stringify(
              data.response,
              null,
              2
            )
          : String(
              data.response ?? ""
            );

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: safeContent,
        },
      ]);
    } catch (error) {
      console.error(
        "CHAT ERROR:",
        error
      );

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "Something went wrong while processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.map(
          (msg, index) => (
            <div
              key={index}
              className={`${
                msg.role === "user"
                  ? "bg-[#C3D69B] text-black ml-auto max-w-5xl p-4 rounded-xl"
                  : "bg-zinc-900 p-4 rounded-xl"
              }`}
            >
              <ReactMarkdown>
                {msg.content || ""}
              </ReactMarkdown>

              {msg.type === "report" &&
                msg.reportData && (
                  <div className="mt-6">
                    <ProcurementDashboard
                      reportData={
                        msg.reportData
                      }
                    />
                  </div>
                )}
            </div>
          )
        )}

        {loading && (
          <div className="bg-zinc-800 p-4 rounded-xl w-fit">
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />

      </div>

      <div className="border-t border-zinc-800 p-4 flex gap-2">

        <input
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Ask Catalogix..."
          className="flex-1 bg-zinc-900 p-3 rounded-xl outline-none"
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-[#C3D69B] text-black px-5 rounded-xl hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? "Thinking..."
            : "Send"}
        </button>

      </div>

    </div>
  );
}