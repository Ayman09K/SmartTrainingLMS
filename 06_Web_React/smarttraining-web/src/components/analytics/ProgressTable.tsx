import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { LearnerProgressResponse } from "../../types/analytics";
import { displayLabel } from "../../utils/displayLabels";

interface ProgressTableProps {
  progressList: LearnerProgressResponse[];
  trainingTitles: ReadonlyMap<number, string>;
}

function clampPercentage(value?: number | null): number {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
}

function statusColor(
  status?: string,
): "default" | "primary" | "success" | "warning" {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "AT_RISK") {
    return "warning";
  }

  if (status === "IN_PROGRESS") {
    return "primary";
  }

  return "default";
}

export function ProgressTable({
  progressList,
  trainingTitles,
}: ProgressTableProps) {
  if (!progressList.length) {
    return (
      <Alert severity="info">
        {"Aucune progression n'est encore enregistr\u00e9e pour vos formations."}
      </Alert>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        boxShadow: "none",
        overflowX: "auto",
      }}
    >
      <Table size="small" aria-label={"Progression par formation"}>
        <TableHead>
          <TableRow>
            <TableCell>{"Formation"}</TableCell>
            <TableCell>{"Progression"}</TableCell>
            <TableCell>{"Le\u00e7ons"}</TableCell>
            <TableCell>{"Quiz"}</TableCell>
            <TableCell>{"Score moyen"}</TableCell>
            <TableCell>{"Statut"}</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {progressList.map((item) => {
            const progress = clampPercentage(item.progressPercentage);
            const title =
              trainingTitles.get(item.trainingId) || "Formation suivie";

            return (
              <TableRow key={item.id} hover>
                <TableCell sx={{ minWidth: 220 }}>
                  <Typography variant="body2" sx={{ fontWeight: 750 }}>
                    {title}
                  </Typography>
                </TableCell>

                <TableCell sx={{ minWidth: 180 }}>
                  <Stack
                    direction="row"
                    spacing={1.25}
                    sx={{ alignItems: "center" }}
                  >
                    <Box sx={{ minWidth: 90, flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        aria-label={`Progression ${progress}%`}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ minWidth: 42, textAlign: "right", fontWeight: 800 }}
                    >
                      {`${progress}%`}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>
                  {`${item.completedLessons ?? 0}/${item.totalLessons ?? 0}`}
                </TableCell>

                <TableCell>
                  {`${item.completedQuizzes ?? 0}/${item.totalQuizzes ?? 0}`}
                </TableCell>

                <TableCell>{`${item.averageScore ?? 0}%`}</TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={displayLabel(item.status || "NOT_STARTED")}
                    color={statusColor(item.status)}
                    variant={item.status === "IN_PROGRESS" ? "filled" : "outlined"}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}