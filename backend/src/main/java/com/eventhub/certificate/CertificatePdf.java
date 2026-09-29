package com.eventhub.certificate;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.eventhub.gate.QrCodeService;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

/**
 * Draws the certificate as an A4 landscape PDF (OpenPDF library).
 *
 *   ┌═══════════════════════════════════════════════┐
 *   ║          EVENTHUB · CODING CLUB               ║
 *   ║      Certificate of Participation             ║
 *   ║          This is to certify that              ║
 *   ║               Ravi Kumar                      ║
 *   ║   participated in Tech Fest 2026, ...         ║
 *   ║  ________                    [QR] EH-2026-... ║
 *   ║  Club Coordinator            scan to verify   ║
 *   └═══════════════════════════════════════════════┘
 *
 * The QR code opens the public verify page, so anyone can check the certificate is real.
 * Note: the built-in PDF fonts cover English letters only; names in Tamil or Hindi script
 * would need a TTF font embedded (FontFactory.register) - a good Phase 8 improvement.
 */
@Component
public class CertificatePdf {

	private static final Color BRAND = new Color(0x43, 0x38, 0xCA); // Tailwind indigo-700, like the app

	private static final Color GREY = new Color(0x47, 0x55, 0x69);

	private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.ENGLISH);

	private final QrCodeService qr;

	private final String frontendUrl;

	public CertificatePdf(QrCodeService qr, @Value("${app.frontend-url}") String frontendUrl) {
		this.qr = qr;
		this.frontendUrl = frontendUrl;
	}

	public byte[] render(Certificate c) {
		var event = c.getEvent();
		String club = event.getClub().getName();
		String verifyUrl = frontendUrl + "/verify/" + c.getNumber();

		ByteArrayOutputStream out = new ByteArrayOutputStream();
		Document doc = new Document(PageSize.A4.rotate(), 70, 70, 60, 50);
		try {
			PdfWriter writer = PdfWriter.getInstance(doc, out);
			doc.addTitle("Certificate " + c.getNumber());
			doc.addAuthor("EventHub");
			doc.open();
			drawBorder(writer.getDirectContentUnder(), doc.getPageSize());

			doc.add(centered(new Phrase(("EventHub  ·  " + club).toUpperCase(Locale.ROOT),
					FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BRAND)), 10));
			doc.add(centered(new Phrase("Certificate of Participation",
					FontFactory.getFont(FontFactory.TIMES_BOLD, 38, Color.BLACK)), 28));
			doc.add(centered(new Phrase("This is to certify that", FontFactory.getFont(FontFactory.TIMES_ROMAN, 15, GREY)), 8));
			doc.add(centered(new Phrase(c.getHolderName(), FontFactory.getFont(FontFactory.TIMES_BOLDITALIC, 32, BRAND)), 18));

			Font text = FontFactory.getFont(FontFactory.TIMES_ROMAN, 15, Color.DARK_GRAY);
			Font bold = FontFactory.getFont(FontFactory.TIMES_BOLD, 15, Color.DARK_GRAY);
			Phrase body = new Phrase();
			body.add(new Chunk("participated in ", text));
			body.add(new Chunk(event.getTitle(), bold));
			body.add(new Chunk(", organised by the " + club + ", held on ", text));
			body.add(new Chunk(DAY.format(event.getStartTime()), bold));
			body.add(new Chunk(" at " + event.getVenue() + ".", text));
			Paragraph p = centered(body, 75);
			p.setIndentationLeft(60);
			p.setIndentationRight(60);
			p.setLeading(22);
			doc.add(p);

			doc.add(footer(c, club, verifyUrl));
			doc.close();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
		return out.toByteArray();
	}

	private static Paragraph centered(Phrase phrase, float spaceAfter) {
		Paragraph p = new Paragraph(phrase);
		p.setAlignment(Element.ALIGN_CENTER);
		p.setSpacingAfter(spaceAfter);
		return p;
	}

	/** Two frames, like a printed certificate: thick outer line, thin inner line. */
	private static void drawBorder(PdfContentByte canvas, Rectangle page) {
		canvas.setColorStroke(BRAND);
		canvas.setLineWidth(6);
		canvas.rectangle(22, 22, page.getWidth() - 44, page.getHeight() - 44);
		canvas.stroke();
		canvas.setLineWidth(1.2f);
		canvas.rectangle(34, 34, page.getWidth() - 68, page.getHeight() - 68);
		canvas.stroke();
	}

	/** Bottom row: signature line on the left, verify QR + number on the right. */
	private PdfPTable footer(Certificate c, String club, String verifyUrl) throws IOException {
		PdfPTable table = new PdfPTable(new float[] { 5, 1.3f, 3.2f });
		table.setWidthPercentage(100);

		Font small = FontFactory.getFont(FontFactory.HELVETICA, 9, GREY);
		Font label = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.DARK_GRAY);

		PdfPCell sign = new PdfPCell();
		sign.setBorder(Rectangle.NO_BORDER);
		sign.setVerticalAlignment(Element.ALIGN_BOTTOM);
		sign.addElement(new Paragraph("______________________", label));
		sign.addElement(new Paragraph("Club Coordinator", label));
		sign.addElement(new Paragraph(club, small));
		table.addCell(sign);

		Image code = Image.getInstance(qr.png(verifyUrl, 300));
		code.scaleAbsolute(78, 78);
		PdfPCell qrCell = new PdfPCell(code, false);
		qrCell.setBorder(Rectangle.NO_BORDER);
		qrCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
		table.addCell(qrCell);

		PdfPCell number = new PdfPCell();
		number.setBorder(Rectangle.NO_BORDER);
		number.setVerticalAlignment(Element.ALIGN_MIDDLE);
		number.addElement(new Paragraph("Certificate number", small));
		number.addElement(new Paragraph(c.getNumber(), FontFactory.getFont(FontFactory.COURIER_BOLD, 13, Color.BLACK)));
		number.addElement(new Paragraph("Scan the code or open " + verifyUrl + " to check it is real.", small));
		table.addCell(number);
		return table;
	}

}
