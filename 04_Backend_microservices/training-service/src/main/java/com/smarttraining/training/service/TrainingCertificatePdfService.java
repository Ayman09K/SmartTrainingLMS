package com.smarttraining.training.service;

import com.smarttraining.training.entity.TrainingCertificate;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

@Service
public class TrainingCertificatePdfService {

    private static final float PAGE_WIDTH = 842f;
    private static final float PAGE_HEIGHT = 595f;
    private static final String LOGO_RESOURCE =
            "/branding/SmartTraining_brand_mark.png";

    private static final int NAVY_R = 8;
    private static final int NAVY_G = 25;
    private static final int NAVY_B = 66;
    private static final int BLUE_R = 37;
    private static final int BLUE_G = 66;
    private static final int BLUE_B = 238;
    private static final int CYAN_R = 6;
    private static final int CYAN_G = 182;
    private static final int CYAN_B = 212;
    private static final int MUTED_R = 71;
    private static final int MUTED_G = 85;
    private static final int MUTED_B = 105;

    private final PDType1Font regular =
            new PDType1Font(
                    Standard14Fonts.FontName.HELVETICA
            );

    private final PDType1Font bold =
            new PDType1Font(
                    Standard14Fonts.FontName.HELVETICA_BOLD
            );

    public byte[] generate(
            TrainingCertificate certificate
    ) {
        try (
            PDDocument document = new PDDocument();
            ByteArrayOutputStream output =
                    new ByteArrayOutputStream()
        ) {
            PDPage page = new PDPage(
                    new PDRectangle(
                            PAGE_WIDTH,
                            PAGE_HEIGHT
                    )
            );
            document.addPage(page);

            try (
                PDPageContentStream content =
                        new PDPageContentStream(
                                document,
                                page
                        )
            ) {
                drawBackground(content);
                drawFrame(content);
                drawHeader(document, content);
                drawMainContent(content, certificate);
                drawAuthenticityPanel(content, certificate);
                drawFooter(content);
            }

            document.save(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Generation PDF du certificat impossible.",
                    exception
            );
        }
    }

    private void drawBackground(
            PDPageContentStream content
    ) throws IOException {
        setFillColor(content, 248, 250, 252);
        content.addRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        content.fill();

        setFillColor(content, 255, 255, 255);
        content.addRect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60);
        content.fill();

        setFillColor(content, NAVY_R, NAVY_G, NAVY_B);
        content.addRect(30, 30, 12, PAGE_HEIGHT - 60);
        content.fill();

        setFillColor(content, BLUE_R, BLUE_G, BLUE_B);
        content.addRect(42, 30, 5, PAGE_HEIGHT - 60);
        content.fill();

        setFillColor(content, CYAN_R, CYAN_G, CYAN_B);
        content.addRect(47, 30, 3, PAGE_HEIGHT - 60);
        content.fill();
    }

    private void drawFrame(
            PDPageContentStream content
    ) throws IOException {
        setStrokeColor(content, NAVY_R, NAVY_G, NAVY_B);
        content.setLineWidth(1.4f);
        content.addRect(
                30,
                30,
                PAGE_WIDTH - 60,
                PAGE_HEIGHT - 60
        );
        content.stroke();

        setStrokeColor(content, 203, 213, 225);
        content.setLineWidth(0.6f);
        content.addRect(
                58,
                44,
                PAGE_WIDTH - 102,
                PAGE_HEIGHT - 88
        );
        content.stroke();
    }

    private void drawHeader(
            PDDocument document,
            PDPageContentStream content
    ) throws IOException {
        drawLogo(document, content, 72f, 482f, 62f);

        setNavy(content);
        drawText(
                content,
                bold,
                22,
                145,
                520,
                "SmartTraining AI"
        );

        setMuted(content);
        drawText(
                content,
                bold,
                9.5f,
                146,
                499,
                "CERTIFICATION NUM\u00C9RIQUE"
        );

        setStrokeColor(content, 226, 232, 240);
        content.setLineWidth(0.8f);
        content.moveTo(72, 472);
        content.lineTo(PAGE_WIDTH - 72, 472);
        content.stroke();

        setFillColor(content, 239, 246, 255);
        content.addRect(600, 500, 165, 28);
        content.fill();

        setBlue(content);
        drawCenteredInBox(
                content,
                bold,
                10,
                600,
                500,
                165,
                28,
                "CERTIFICAT OFFICIEL"
        );
    }

    private void drawMainContent(
            PDPageContentStream content,
            TrainingCertificate certificate
    ) throws IOException {
        setNavy(content);
        drawCentered(
                content,
                bold,
                29,
                427,
                "CERTIFICAT DE R\u00C9USSITE"
        );

        setFillColor(content, CYAN_R, CYAN_G, CYAN_B);
        content.addRect((PAGE_WIDTH - 88) / 2f, 406, 88, 4);
        content.fill();

        setMuted(content);
        drawCentered(
                content,
                regular,
                13,
                374,
                "Ce certificat atteste que"
        );

        setBlue(content);
        drawCenteredWrapped(
                content,
                bold,
                26,
                332,
                certificate.getLearnerDisplayNameSnapshot(),
                630f,
                30f,
                2
        );

        setMuted(content);
        drawCentered(
                content,
                regular,
                13,
                278,
                "a termin\u00E9 avec succ\u00E8s la formation"
        );

        setNavy(content);
        drawCenteredWrapped(
                content,
                bold,
                20,
                238,
                certificate.getTrainingTitleSnapshot(),
                650f,
                25f,
                3
        );
    }

    private void drawAuthenticityPanel(
            PDPageContentStream content,
            TrainingCertificate certificate
    ) throws IOException {
        setFillColor(content, 248, 250, 252);
        content.addRect(75, 82, PAGE_WIDTH - 150, 92);
        content.fill();

        setStrokeColor(content, 226, 232, 240);
        content.setLineWidth(0.8f);
        content.addRect(75, 82, PAGE_WIDTH - 150, 92);
        content.stroke();

        String issued = certificate
                .getIssuedAt()
                .format(
                    DateTimeFormatter.ofPattern(
                        "dd/MM/yyyy"
                    )
                );

        setMuted(content);
        drawText(content, bold, 8.5f, 94, 145, "DATE DE D\u00C9LIVRANCE");
        setNavy(content);
        drawText(content, bold, 12.5f, 94, 124, issued);

        setStrokeColor(content, 203, 213, 225);
        content.setLineWidth(0.7f);
        content.moveTo(250, 100);
        content.lineTo(250, 157);
        content.stroke();

        setMuted(content);
        drawText(content, bold, 8.5f, 272, 145, "AUTHENTICITE");
        setNavy(content);
        drawText(
                content,
                bold,
                11,
                272,
                124,
                "Certificat v\u00E9rifiable en ligne"
        );

        setFillColor(content, 220, 252, 231);
        content.addRect(603, 122, 132, 27);
        content.fill();
        setFillColor(content, 21, 128, 61);
        drawCenteredInBox(
                content,
                bold,
                10,
                603,
                122,
                132,
                27,
                "CERTIFICAT VALIDE"
        );

        setMuted(content);
        drawText(
                content,
                regular,
                8.5f,
                94,
                96,
                "Code public de v\u00E9rification : "
                        + certificate.getPublicCode()
        );
    }

    private void drawFooter(
            PDPageContentStream content
    ) throws IOException {
        setMuted(content);
        drawCentered(
                content,
                regular,
                8.5f,
                57,
                "SmartTraining AI - Apprendre, progresser, r\u00E9ussir."
        );
    }

    private void drawLogo(
            PDDocument document,
            PDPageContentStream content,
            float x,
            float y,
            float size
    ) throws IOException {
        try (
            InputStream input = getClass()
                    .getResourceAsStream(LOGO_RESOURCE)
        ) {
            if (input != null) {
                PDImageXObject logo =
                        PDImageXObject.createFromByteArray(
                                document,
                                input.readAllBytes(),
                                "SmartTraining AI logo"
                        );
                content.drawImage(logo, x, y, size, size);
                return;
            }
        }

        setFillColor(content, BLUE_R, BLUE_G, BLUE_B);
        content.addRect(x + 8, y + 8, size - 16, size - 16);
        content.fill();
        setFillColor(content, 255, 255, 255);
        drawCenteredInBox(
                content,
                bold,
                18,
                x + 8,
                y + 8,
                size - 16,
                size - 16,
                "S"
        );
    }

    private void setNavy(
            PDPageContentStream content
    ) throws IOException {
        setFillColor(content, NAVY_R, NAVY_G, NAVY_B);
    }

    private void setBlue(
            PDPageContentStream content
    ) throws IOException {
        setFillColor(content, BLUE_R, BLUE_G, BLUE_B);
    }

    private void setMuted(
            PDPageContentStream content
    ) throws IOException {
        setFillColor(content, MUTED_R, MUTED_G, MUTED_B);
    }

    private void setFillColor(
            PDPageContentStream content,
            int red,
            int green,
            int blue
    ) throws IOException {
        content.setNonStrokingColor(
                normalizeColor(red),
                normalizeColor(green),
                normalizeColor(blue)
        );
    }

    private void setStrokeColor(
            PDPageContentStream content,
            int red,
            int green,
            int blue
    ) throws IOException {
        content.setStrokingColor(
                normalizeColor(red),
                normalizeColor(green),
                normalizeColor(blue)
        );
    }

    private float normalizeColor(int value) {
        if (value < 0 || value > 255) {
            throw new IllegalArgumentException(
                    "Composante couleur RGB hors limites: " + value
            );
        }
        return value / 255f;
    }

    private void drawText(
            PDPageContentStream content,
            PDType1Font font,
            float size,
            float x,
            float y,
            String raw
    ) throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        content.showText(safeText(raw));
        content.endText();
    }

    private void drawCentered(
            PDPageContentStream content,
            PDType1Font font,
            float size,
            float y,
            String raw
    ) throws IOException {
        String text = safeText(raw);
        float width = textWidth(font, size, text);

        drawText(
                content,
                font,
                size,
                Math.max(65f, (PAGE_WIDTH - width) / 2f),
                y,
                text
        );
    }

    private void drawCenteredInBox(
            PDPageContentStream content,
            PDType1Font font,
            float size,
            float x,
            float y,
            float width,
            float height,
            String raw
    ) throws IOException {
        String text = safeText(raw);
        float textWidth = textWidth(font, size, text);
        float textX = x + Math.max(6f, (width - textWidth) / 2f);
        float textY = y + (height - size) / 2f + 2.5f;
        drawText(content, font, size, textX, textY, text);
    }

    private void drawCenteredWrapped(
            PDPageContentStream content,
            PDType1Font font,
            float size,
            float y,
            String raw,
            float maxWidth,
            float lineHeight,
            int maxLines
    ) throws IOException {
        List<String> lines = wrap(
                font,
                size,
                safeText(raw),
                maxWidth,
                maxLines
        );

        float currentY = y;
        for (String line : lines) {
            drawCentered(
                    content,
                    font,
                    size,
                    currentY,
                    line
            );
            currentY -= lineHeight;
        }
    }

    private List<String> wrap(
            PDType1Font font,
            float size,
            String text,
            float maxWidth,
            int maxLines
    ) throws IOException {
        String[] words = text.split("\\s+");
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (String word : words) {
            String candidate =
                    current.length() == 0
                    ? word
                    : current + " " + word;

            if (textWidth(font, size, candidate) <= maxWidth
                    || current.length() == 0) {
                current.setLength(0);
                current.append(candidate);
            } else {
                lines.add(current.toString());
                current.setLength(0);
                current.append(word);

                if (lines.size() == maxLines - 1) {
                    break;
                }
            }
        }

        if (current.length() > 0 && lines.size() < maxLines) {
            lines.add(fitWithEllipsis(font, size, current.toString(), maxWidth));
        }

        return lines;
    }

    private String fitWithEllipsis(
            PDType1Font font,
            float size,
            String text,
            float maxWidth
    ) throws IOException {
        if (textWidth(font, size, text) <= maxWidth) {
            return text;
        }

        String ellipsis = "...";
        String fitted = text;
        while (!fitted.isEmpty()
                && textWidth(font, size, fitted + ellipsis) > maxWidth) {
            fitted = fitted.substring(0, fitted.length() - 1);
        }
        return fitted.trim() + ellipsis;
    }

    private float textWidth(
            PDType1Font font,
            float size,
            String text
    ) throws IOException {
        return font.getStringWidth(text) / 1000f * size;
    }

    private String safeText(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        return value
                .replaceAll("[^\\u0020-\\u00FF]", "?")
                .trim();
    }
}
