package com.smarttraining.training.dto;

import java.util.List;

public class PexelsSearchResponse {

    private final Integer page;
    private final Integer perPage;
    private final Integer totalResults;
    private final List<PexelsPhotoResponse> photos;

    public PexelsSearchResponse(
            Integer page,
            Integer perPage,
            Integer totalResults,
            List<PexelsPhotoResponse> photos
    ) {
        this.page = page;
        this.perPage = perPage;
        this.totalResults = totalResults;
        this.photos = photos == null ? List.of() : List.copyOf(photos);
    }

    public Integer getPage() {
        return page;
    }

    public Integer getPerPage() {
        return perPage;
    }

    public Integer getTotalResults() {
        return totalResults;
    }

    public List<PexelsPhotoResponse> getPhotos() {
        return photos;
    }
}