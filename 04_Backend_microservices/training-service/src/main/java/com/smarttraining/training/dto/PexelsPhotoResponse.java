package com.smarttraining.training.dto;

public class PexelsPhotoResponse {

    private final Long id;
    private final Integer width;
    private final Integer height;
    private final String alt;
    private final String photographer;
    private final String photographerUrl;
    private final String pexelsUrl;
    private final String previewUrl;
    private final String landscapeUrl;

    public PexelsPhotoResponse(
            Long id,
            Integer width,
            Integer height,
            String alt,
            String photographer,
            String photographerUrl,
            String pexelsUrl,
            String previewUrl,
            String landscapeUrl
    ) {
        this.id = id;
        this.width = width;
        this.height = height;
        this.alt = alt;
        this.photographer = photographer;
        this.photographerUrl = photographerUrl;
        this.pexelsUrl = pexelsUrl;
        this.previewUrl = previewUrl;
        this.landscapeUrl = landscapeUrl;
    }

    public Long getId() {
        return id;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }

    public String getAlt() {
        return alt;
    }

    public String getPhotographer() {
        return photographer;
    }

    public String getPhotographerUrl() {
        return photographerUrl;
    }

    public String getPexelsUrl() {
        return pexelsUrl;
    }

    public String getPreviewUrl() {
        return previewUrl;
    }

    public String getLandscapeUrl() {
        return landscapeUrl;
    }
}