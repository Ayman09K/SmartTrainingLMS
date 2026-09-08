import { useState } from "react";


import type { FormEvent } from "react";


import { Link as RouterLink } from "react-router-dom";


import {


  Alert,


  Box,


  Button,


  CircularProgress,


  TextField,


  Typography,


} from "@mui/material";


import { MailCheck } from "lucide-react";





import { requestPasswordReset } from "../../api/passwordResetApi";


import { AuthPageShell } from "../../components/auth/AuthPageShell";





const NEUTRAL_MESSAGE =


  "Si un compte correspond à cette adresse e-mail, un lien de réinitialisation a été envoyé.";





export function ForgotPasswordPage() {


  const [email, setEmail] = useState("");


  const [message, setMessage] = useState("");


  const [error, setError] = useState("");


  const [submitting, setSubmitting] = useState(false);





  async function handleSubmit(event: FormEvent<HTMLFormElement>) {


    event.preventDefault();





    const normalizedEmail = email.trim().toLowerCase();





    if (!normalizedEmail) {


      setError("Saisissez votre adresse e-mail.");


      return;


    }





    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {


      setError("Saisissez une adresse e-mail valide.");


      return;


    }





    try {


      setSubmitting(true);


      setError("");


      setMessage("");





      await requestPasswordReset(normalizedEmail);





      // Toujours le même texte côté interface pour ne pas révéler


      // si une adresse correspond ou non à un compte.


      setMessage(NEUTRAL_MESSAGE);


    } catch {


      setError(


        "Impossible de traiter la demande pour le moment. Réessayez ultérieurement.",


      );


    } finally {


      setSubmitting(false);


    }


  }





  return (


    <AuthPageShell


      eyebrow="Sécurité du compte"


      title="Mot de passe oublié"


      description="Indiquez l’adresse e-mail de votre compte SmartTraining pour recevoir un lien temporaire de réinitialisation."


      footer={


        <Typography variant="body2" color="text.secondary" align="center">


          Vous connaissez votre mot de passe ?{" "}


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


      <Box


        component="form"


        onSubmit={handleSubmit}


        noValidate


        sx={{ display: "grid", gap: 2 }}


      >


        <TextField


          label="Adresse e-mail"


          type="email"


          value={email}


          onChange={(event) => setEmail(event.target.value)}


          placeholder="votre@email.com"


          autoComplete="email"


          required


          fullWidth


          disabled={submitting}


        />





        {message ? (


          <Alert severity="success" role="status">


            {message}


          </Alert>


        ) : null}





        {error ? (


          <Alert severity="error" role="alert">


            {error}


          </Alert>


        ) : null}





        <Button


          type="submit"


          variant="contained"


          size="large"


          disabled={submitting}


          startIcon={


            submitting ? (


              <CircularProgress size={18} color="inherit" />


            ) : (


              <MailCheck size={19} />


            )


          }


          sx={{ mt: 0.5, minHeight: 46 }}


        >


          {submitting ? "Envoi..." : "Recevoir le lien"}


        </Button>


      </Box>


    </AuthPageShell>


  );


}