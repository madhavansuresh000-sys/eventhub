package com.eventhub.gate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

/**
 * Draws a QR code as a PNG picture (ZXing library).
 * The QR holds ONLY the random ticket code (e.g. EVH-7QK2M-P4XZA) - no name, no price - so a photo of
 * someone's ticket tells nothing about them. The gate asks the server what the code means.
 */
@Service
public class QrCodeService {

	public byte[] png(String text, int size) {
		try {
			// M = about 15% of the squares may be dirty or scratched and it still reads; margin 2 = white border
			BitMatrix matrix = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size,
					Map.of(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M, EncodeHintType.MARGIN, 2));
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			MatrixToImageWriter.writeToStream(matrix, "PNG", out);
			return out.toByteArray();
		}
		catch (WriterException ex) {
			throw new IllegalArgumentException("Cannot make a QR code of: " + text, ex);
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

}
