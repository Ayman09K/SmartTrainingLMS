import { useMemo, useState } from "react";


import type { FormEvent } from "react";


import {


  Link as RouterLink,


  useSearchParams,


} from "react-router-dom";


import {


  Alert,


  Box,


  Button,


  CircularProgress,


  TextField,


  Typography,


} from "@mui/material";


import { KeyRound } from "lucide-react";





import { resetPassword } from "../../api/passwordResetApi";


import { AuthPageShell } from "../../components/auth/AuthPageShell";





function resetErrorMessage(error: unknown): string {


  const candidate = error as {


    response?: {


      data?: unknown;


    };


  };





  const data = candidate.response?.data;





  if (data && typeof data === "object") {


    const record = data as Record<string, unknown>;


    const backendMessage =


      typeof record.message === "string" ? record.message : "";





    if (


      backendMessage.includes("PASSWORD_RESET_TOKEN_INVALID") ||


      backendMessage.includes("PASSWORD_RESET_TOKEN_EXPIRED")


    ) {


      return "Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.";


    }





    if (backendMessage.toLocaleLowerCase("fr").includes("différent")) {


      return "Le nouveau mot de passe doit être différent de l’ancien.";


    }


  }





  return "La réinitialisation n’a pas pu être effectuée. Demandez un nouveau lien puis réessayez.";


}





export function ResetPasswordPage() {


  const [searchParams] = useSearchParams();


  const token = useMemo(


    () => (searchParams.get("token") ?? "").trim(),


    [searchParams],


  );





  const [newPassword, setNewPassword] = useState("");


  const [confirmPassword, setConfirmPassword] = useState("");


  const [success, setSuccess] = useState(false);


  const [error, setError] = useState("");


  const [submitting, setSubmitting] = useState(false);





  async function handleSubmit(event: FormEvent<HTMLFormElement>) {


    event.preventDefault();





    if (!token) {


      setError(


        "Le lien de réinitialisation est incomplet. Demandez un nouveau lien.",


      );


      return;


    }





    if (newPassword.length < 6 || newPassword.length > 100) {


      setError(


        "Le nouveau mot de passe doit contenir entre 6 et 100 caractères.",


      );


      return;


    }





    if (newPassword !== confirmPassword) {


      setError("Les mots de passe ne correspondent pas.");


      return;


    }





    try {


      setSubmitting(true);


      setError("");





      await resetPassword(token, newPassword);





      setSuccess(true);


      setNewPassword("");


      setConfirmPassword("");


    } catch (resetError) {


      setError(resetErrorMessage(resetError));


    } finally {


      setSubmitting(false);


    }


  }





  return (


    <AuthPageShell


      eyebrow="Sécurité du compte"


      title="Choisir un nouveau mot de passe"


      description="Définissez un nouveau mot de passe pour retrouver l’accès à votre compte SmartTraining."


      footer={


        <Typography variant="body2" color="text.secondary" align="center">


          <Box


            component={RouterLink}


            to="/login"


            sx={{


              color: "primary.main",


              fontWeight: 800,


              textDecoration: "none",


              "&:hover": { textDecoration: "underline" },


            }}


          >


            Retour à la connexion


          </Box>


        </Typography>


      }


    >


      {!token ? (


        <Alert severity="error" role="alert" sx={{ mb: 2 }}>


          Ce lien de réinitialisation est incomplet. Demandez un nouveau lien.


        </Alert>


      ) : null}





      {success ? (


        <Alert severity="success" role="status">


          Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.


        </Alert>


      ) : (


        <Box


          component="form"


          onSubmit={handleSubmit}


          noValidate


          sx={{ display: "grid", gap: 2 }}


        >


          <TextField


            label="Nouveau mot de passe"


            type="password"


            value={newPassword}


            onChange={(event) => setNewPassword(event.target.value)}


            autoComplete="new-password"


            required


            fullWidth


            disabled={submitting || !token}


          />





          <TextField


            label="Confirmer le nouveau mot de passe"


            type="password"


            value={confirmPassword}


            onChange={(event) => setConfirmPassword(event.target.value)}


            autoComplete="new-password"


            required


            fullWidth


            disabled={submitting || !token}


          />





          {error ? (


            <Alert severity="error" role="alert">


              {error}


            </Alert>


          ) : null}





          <Button


            type="submit"


            variant="contained"


            size="large"


            disabled={submitting || !token}


            startIcon={


              submitting ? (


                <CircularProgress size={18} color="inherit" />


              ) : (


                <KeyRound size={19} />


              )


            }


            sx={{ mt: 0.5, minHeight: 46 }}


          >


            {submitting


              ? "Réinitialisation..."


              : "Réinitialiser mon mot de passe"}


          </Button>


        </Box>


      )}


    </AuthPageShell>


  );


}