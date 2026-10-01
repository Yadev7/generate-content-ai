import type { ChatMessage } from "@/lib/chat";

const MARGIN = 56;
const LINE_HEIGHT = 16;
const PAGE_HEIGHT = 297;
const BOTTOM_LIMIT = PAGE_HEIGHT - 56;
const PAGE_WIDTH = 210;

/** Exports the conversation to a paginated PDF transcript. */
export async function exportChatToPdf(
  messages: ChatMessage[],
  filename = "sai-conversation"
) {
  if (messages.length === 0) return;

  // jspdf is large and only needed on click, so keep it out of the initial
  // bundle and pull it in on demand.
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const usableWidth = PAGE_WIDTH - MARGIN * 2;
  let y = MARGIN;

  const ensureRoom = (needed: number) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage();
      y = MARGIN;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SAI Conversation", MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString(), MARGIN, y);
  doc.setTextColor(0);
  y += 12;

  for (const message of messages) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(message.role === "user" ? 90 : 130);
    doc.text(message.role === "user" ? "You" : "SAI", MARGIN, y);
    doc.setTextColor(0);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Strip the light markdown syntax so the PDF reads as plain prose.
    const text = message.content
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, "").trim())
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*|__/g, "")
      .replace(/^\s*[-*+]\s+/gm, "- ")
      .trim();

    for (const line of doc.splitTextToSize(text || "(empty)", usableWidth) as string[]) {
      ensureRoom(LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += 6;
    }

    y += 8;
    ensureRoom(0);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${i} / ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, {
      align: "right",
    });
  }

  doc.save(`${filename}.pdf`);
}
