package com.smarttraining.training.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.FileUploadResponse;
import com.smarttraining.training.dto.PexelsPhotoResponse;
import com.smarttraining.training.dto.PexelsSearchResponse;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.net.URI;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PexelsCoverService {

    private static final int DEFAULT_PER_PAGE = 12;
    private static final int MAX_PER_PAGE = 24;
    private static final String PEXELS_IMAGE_HOST =
            "images.pexels.com";

    private final TrainingOwnershipService ownershipService;
    private final FileStorageService fileStorageService;
    private final ResourceUploadService resourceUploadService;
    private final UploadProperties uploadProperties;
    private final String apiKey;
    private final RestClient pexelsClient;
    private final RestClient imageClient;

    public PexelsCoverService(
            TrainingOwnershipService ownershipService,
            FileStorageService fileStorageService,
            ResourceUploadService resourceUploadService,
            UploadProperties uploadProperties,
            @Value("${smarttraining.pexels.api-key:}")
            String apiKey,
            @Value(
                "${smarttraining.pexels.base-url:"
                + "https://api.pexels.com}"
            )
            String baseUrl
    ) {
        this.ownershipService = ownershipService;
        this.fileStorageService = fileStorageService;
        this.resourceUploadService = resourceUploadService;
        this.uploadProperties = uploadProperties;
        this.apiKey = apiKey == null
                ? ""
                : apiKey.trim();

        this.pexelsClient =
                RestClient.builder()
                        .baseUrl(baseUrl)
                        .build();

        this.imageClient =
                RestClient.builder().build();
    }

    public PexelsSearchResponse search(
            String query,
            Integer requestedPage,
            Integer requestedPerPage
    ) {
        ownershipService.requireAdminOrTrainer();
        requireApiKey();

        String normalizedQuery =
                normalizeQuery(query);
        int page = normalizePage(requestedPage);
        int perPage =
                normalizePerPage(requestedPerPage);

        try {
            ApiSearchResponse response =
                    pexelsClient
                            .get()
                            .uri(uriBuilder ->
                                    uriBuilder
                                            .path("/v1/search")
                                            .queryParam(
                                                    "query",
                                                    normalizedQuery
                                            )
                                            .queryParam(
                                                    "orientation",
                                                    "landscape"
                                            )
                                            .queryParam(
                                                    "locale",
                                                    "fr-FR"
                                            )
                                            .queryParam(
                                                    "page",
                                                    page
                                            )
                                            .queryParam(
                                                    "per_page",
                                                    perPage
                                            )
                                            .build()
                            )
                            .header(
                                    HttpHeaders.AUTHORIZATION,
                                    apiKey
                            )
                            .retrieve()
                            .body(ApiSearchResponse.class);

            if (response == null) {
                return new PexelsSearchResponse(
                        page,
                        perPage,
                        0,
                        List.of()
                );
            }

            List<PexelsPhotoResponse> photos =
                    response.getPhotos()
                            .stream()
                            .map(this::toPublicPhoto)
                            .toList();

            return new PexelsSearchResponse(
                    valueOrDefault(
                            response.getPage(),
                            page
                    ),
                    valueOrDefault(
                            response.getPerPage(),
                            perPage
                    ),
                    valueOrDefault(
                            response.getTotalResults(),
                            photos.size()
                    ),
                    photos
            );
        } catch (RestClientResponseException exception) {
            throw mapPexelsError(exception);
        } catch (RestClientException exception) {
            throw pexelsUnavailable();
        }
    }

    public FileUploadResponse importTrainingCover(
            Long trainingId,
            Long photoId
    ) {
        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant formation invalide."
            );
        }

        if (photoId == null || photoId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant photo invalide."
            );
        }

        /*
         * Important: ownership + editable-state check occurs
         * BEFORE any call to Pexels or any file write.
         */
        resourceUploadService
                .assertCanUploadCover(trainingId);

        requireApiKey();

        ApiPhoto photo = fetchPhoto(photoId);

        if (photo.getSrc() == null
                || photo.getSrc().getLandscape() == null
                || photo.getSrc().getLandscape().isBlank()) {
            throw pexelsUnavailable();
        }

        URI imageUri = validatePexelsImageUri(
                photo.getSrc().getLandscape()
        );

        ResponseEntity<byte[]> imageResponse;

        try {
            imageResponse =
                    imageClient
                            .get()
                            .uri(imageUri)
                            .retrieve()
                            .toEntity(byte[].class);
        } catch (RestClientException exception) {
            throw pexelsUnavailable();
        }

        byte[] bytes = imageResponse.getBody();

        MediaType mediaType =
                imageResponse
                        .getHeaders()
                        .getContentType();

        String contentType = mediaType == null
                ? MediaType.IMAGE_JPEG_VALUE
                : mediaType.toString();

        FileUploadResponse stored =
                fileStorageService.storeBytes(
                        bytes,
                        "pexels-" + photoId + ".jpg",
                        contentType,
                        "trainings/"
                                + trainingId
                                + "/cover",
                        uploadProperties
                                .getAllowedImageTypes(),
                        uploadProperties
                                .getMaxImageSizeBytes()
                );

        FileUploadResponse attached =
                resourceUploadService
                        .attachCoverToTraining(
                                trainingId,
                                stored
                        );

        attached.setMessage(
                "Couverture Pexels importee avec succes"
        );

        return attached;
    }

    private ApiPhoto fetchPhoto(Long photoId) {
        try {
            ApiPhoto photo =
                    pexelsClient
                            .get()
                            .uri("/v1/photos/{id}", photoId)
                            .header(
                                    HttpHeaders.AUTHORIZATION,
                                    apiKey
                            )
                            .retrieve()
                            .body(ApiPhoto.class);

            if (photo == null) {
                throw pexelsUnavailable();
            }

            return photo;
        } catch (RestClientResponseException exception) {
            throw mapPexelsError(exception);
        } catch (RestClientException exception) {
            throw pexelsUnavailable();
        }
    }

    private URI validatePexelsImageUri(
            String rawUrl
    ) {
        URI uri;

        try {
            uri = URI.create(rawUrl);
        } catch (IllegalArgumentException exception) {
            throw pexelsUnavailable();
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())
                || uri.getHost() == null
                || !PEXELS_IMAGE_HOST.equalsIgnoreCase(
                        uri.getHost()
                )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Source d'image Pexels invalide."
            );
        }

        return uri;
    }

    private PexelsPhotoResponse toPublicPhoto(
            ApiPhoto photo
    ) {
        ApiPhotoSource source = photo.getSrc();

        return new PexelsPhotoResponse(
                photo.getId(),
                photo.getWidth(),
                photo.getHeight(),
                photo.getAlt(),
                photo.getPhotographer(),
                photo.getPhotographerUrl(),
                photo.getUrl(),
                source == null
                        ? null
                        : source.getMedium(),
                source == null
                        ? null
                        : source.getLandscape()
        );
    }

    private void requireApiKey() {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Bibliotheque d'images non configuree "
                            + "sur ce serveur."
            );
        }
    }

    private ResponseStatusException mapPexelsError(
            RestClientResponseException exception
    ) {
        int status =
                exception
                        .getStatusCode()
                        .value();

        if (status == 429) {
            return new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Quota de recherche d'images "
                            + "temporairement atteint."
            );
        }

        return pexelsUnavailable();
    }

    private ResponseStatusException pexelsUnavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Bibliotheque d'images temporairement "
                        + "indisponible."
        );
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException(
                    "Le terme de recherche est obligatoire."
            );
        }

        String normalized =
                query.trim()
                        .replaceAll("\\s+", " ");

        if (normalized.length() < 2) {
            throw new IllegalArgumentException(
                    "Le terme de recherche doit contenir "
                            + "au moins 2 caracteres."
            );
        }

        if (normalized.length() > 100) {
            throw new IllegalArgumentException(
                    "Le terme de recherche est trop long."
            );
        }

        return normalized;
    }

    private int normalizePage(Integer page) {
        if (page == null) {
            return 1;
        }

        if (page < 1) {
            throw new IllegalArgumentException(
                    "La page doit etre superieure "
                            + "ou egale a 1."
            );
        }

        return page;
    }

    private int normalizePerPage(Integer perPage) {
        if (perPage == null) {
            return DEFAULT_PER_PAGE;
        }

        if (perPage < 1
                || perPage > MAX_PER_PAGE) {
            throw new IllegalArgumentException(
                    "Le nombre de photos doit etre "
                            + "compris entre 1 et "
                            + MAX_PER_PAGE
                            + "."
            );
        }

        return perPage;
    }

    private int valueOrDefault(
            Integer value,
            int fallback
    ) {
        return value == null
                ? fallback
                : value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ApiSearchResponse {

        private Integer page;

        @JsonProperty("per_page")
        private Integer perPage;

        @JsonProperty("total_results")
        private Integer totalResults;

        private List<ApiPhoto> photos;

        public Integer getPage() {
            return page;
        }

        public void setPage(Integer page) {
            this.page = page;
        }

        public Integer getPerPage() {
            return perPage;
        }

        public void setPerPage(Integer perPage) {
            this.perPage = perPage;
        }

        public Integer getTotalResults() {
            return totalResults;
        }

        public void setTotalResults(
                Integer totalResults
        ) {
            this.totalResults = totalResults;
        }

        public List<ApiPhoto> getPhotos() {
            return photos == null
                    ? List.of()
                    : photos;
        }

        public void setPhotos(
                List<ApiPhoto> photos
        ) {
            this.photos = photos;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ApiPhoto {

        private Long id;
        private Integer width;
        private Integer height;
        private String url;
        private String photographer;

        @JsonProperty("photographer_url")
        private String photographerUrl;

        private String alt;
        private ApiPhotoSource src;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Integer getWidth() {
            return width;
        }

        public void setWidth(Integer width) {
            this.width = width;
        }

        public Integer getHeight() {
            return height;
        }

        public void setHeight(Integer height) {
            this.height = height;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getPhotographer() {
            return photographer;
        }

        public void setPhotographer(
                String photographer
        ) {
            this.photographer = photographer;
        }

        public String getPhotographerUrl() {
            return photographerUrl;
        }

        public void setPhotographerUrl(
                String photographerUrl
        ) {
            this.photographerUrl =
                    photographerUrl;
        }

        public String getAlt() {
            return alt;
        }

        public void setAlt(String alt) {
            this.alt = alt;
        }

        public ApiPhotoSource getSrc() {
            return src;
        }

        public void setSrc(ApiPhotoSource src) {
            this.src = src;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ApiPhotoSource {

        private String medium;
        private String landscape;

        public String getMedium() {
            return medium;
        }

        public void setMedium(String medium) {
            this.medium = medium;
        }

        public String getLandscape() {
            return landscape;
        }

        public void setLandscape(
                String landscape
        ) {
            this.landscape = landscape;
        }
    }
}