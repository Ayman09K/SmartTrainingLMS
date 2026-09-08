import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ImagePlus, Search, X } from "lucide-react";
import { useState } from "react";
import {
  searchPexelsCovers,
  type PexelsCoverPhoto,
} from "../../api/pexelsCoverApi";
import { getApiErrorMessage } from "../../api/apiClient";

type Props = {
  selectedPhoto: PexelsCoverPhoto | null;
  onSelect: (photo: PexelsCoverPhoto) => void;
  initialQuery?: string;
  disabled?: boolean;
};

export function PexelsCoverPicker({
  selectedPhoto,
  onSelect,
  initialQuery = "",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<PexelsCoverPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setError("Saisissez au moins 2 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await searchPexelsCovers(normalized);
      setPhotos(result.photos);
    } catch (cause) {
      setPhotos([]);
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={selectedPhoto ? "contained" : "outlined"}
        startIcon={<ImagePlus size={17} />}
        disabled={disabled}
        onClick={() => {
          setQuery((current) => current || initialQuery);
          setOpen(true);
        }}
      >
        {selectedPhoto
          ? "Changer l'image Pexels"
          : "Choisir dans Pexels"}
      </Button>

      {selectedPhoto ? (
        <Typography variant="caption" color="text.secondary">
          Photo :{" "}
          <Link
            href={selectedPhoto.photographerUrl}
            target="_blank"
            rel="noreferrer"
          >
            {selectedPhoto.photographer}
          </Link>{" "}
          via{" "}
          <Link
            href={selectedPhoto.pexelsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Pexels
          </Link>
        </Typography>
      ) : null}

      <Dialog
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Bibliotheque de couvertures Pexels
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
            >
              <TextField
                autoFocus
                fullWidth
                label="Rechercher une image"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="Ex. developpement web, data, leadership..."
              />

              <Button
                type="button"
                variant="contained"
                startIcon={
                  loading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Search size={17} />
                  )
                }
                disabled={loading}
                onClick={() => void runSearch()}
                sx={{ minWidth: 150 }}
              >
                Rechercher
              </Button>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {!loading && !error && photos.length === 0 ? (
              <Alert severity="info">
                Recherchez un theme pour afficher des couvertures au format paysage.
              </Alert>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {photos.map((photo) => (
                <Card
                  key={photo.id}
                  variant="outlined"
                  sx={{
                    overflow: "hidden",
                    borderColor:
                      selectedPhoto?.id === photo.id
                        ? "primary.main"
                        : "divider",
                    borderWidth:
                      selectedPhoto?.id === photo.id ? 2 : 1,
                  }}
                >
                  <CardActionArea
                    onClick={() => {
                      onSelect(photo);
                      setOpen(false);
                    }}
                  >
                    <Box
                      component="img"
                      src={photo.previewUrl || photo.landscapeUrl}
                      alt={photo.alt || "Photo Pexels"}
                      loading="lazy"
                      sx={{
                        width: "100%",
                        height: 170,
                        objectFit: "cover",
                        display: "block",
                        bgcolor: "action.hover",
                      }}
                    />

                    <CardContent>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {photo.photographer}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Photo Pexels Â· cliquer pour selectionner
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>

            <Typography variant="caption" color="text.secondary">
              Photos fournies par{" "}
              <Link
                href="https://www.pexels.com/"
                target="_blank"
                rel="noreferrer"
              >
                Pexels
              </Link>
              . La photo choisie sera importee dans SmartTraining lors de
              l'enregistrement de la formation.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="button"
            startIcon={<X size={16} />}
            disabled={loading}
            onClick={() => setOpen(false)}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}