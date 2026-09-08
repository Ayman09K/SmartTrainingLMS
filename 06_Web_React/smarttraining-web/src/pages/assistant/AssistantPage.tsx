import { Box } from "@mui/material";

import { WebAssistantStandalone } from "../../components/assistant/WebAssistant";

export function AssistantPage() {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 980,
        mx: "auto",
      }}
    >
      <WebAssistantStandalone />
    </Box>
  );
}
