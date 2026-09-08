import { useState } from "react";


import type { FormEvent } from "react";


import {


  Link as RouterLink,


  Navigate,


  useLocation,


  useNavigate,


} from "react-router-dom";


import {


  Alert,


  Box,


  Button,


  CircularProgress,


  TextField,


  Typography,


} from "@mui/material";


import { LogIn } from "lucide-react";


import { AuthPageShell } from "../../components/auth/AuthPageShell";


import { useAuth } from "../../features/auth/AuthContext";





type LoginLocationState = {


  registrationSuccess?: boolean;


  registeredEmail?: string;


};





export function LoginPage() {


  const { isAuthenticated, loading, loginUser } = useAuth();


  const navigate = useNavigate();


  const location = useLocation();


  const locationState = location.state as LoginLocationState | null;





  const [email, setEmail] = useState(locationState?.registeredEmail ?? "");


  const [password, setPassword] = useState("");


  const [error, setError] = useState("");


  const [submitting, setSubmitting] = useState(false);





  if (!loading && isAuthenticated) {


    return <Navigate to="/" replace />;


  }





  async function handleSubmit(event: FormEvent<HTMLFormElement>) {


    event.preventDefault();





    if (!email.trim() || !password) {


      setError("Saisissez votre adresse e-mail et votre mot de passe.");


      return;


    }





    try {


      setSubmitting(true);


      setError("");





      const user = await loginUser({


        email: email.trim(),


        password,


      });





      navigate(


        user.role === "ADMIN"


          ? "/admin"


          : user.role === "FORMATEUR"


            ? "/trainer"


            : "/learner",


        { replace: true },


      );


    } catch {


      setError(


        "Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe.",


      );


    } finally {


      setSubmitting(false);


    }


  }





  return (


    <AuthPageShell


      eyebrow="Connexion"


      title="Accédez à votre espace de formation"


      description="Retrouvez vos cours, votre progression et votre accompagnement personnalisé."


      footer={


        <Typography variant="body2" color="text.secondary" align="center">


          Pas encore de compte ?{" "}


          <Box


            component={RouterLink}


            to="/register"


            sx={{


              color: "primary.main",


              fontWeight: 800,


              textDecoration: "none",


              "&:hover": { textDecoration: "underline" },


            }}


          >


            Créer mon compte


          </Box>


        </Typography>


      }


    >


      {locationState?.registrationSuccess ? (


        <Alert severity="success" role="status" sx={{ mb: 2.5 }}>


          <strong>Compte créé avec succès.</strong>{" "}


          Connectez-vous avec votre adresse e-mail et votre mot de passe.


        </Alert>


      ) : null}





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





        <TextField


          label="Mot de passe"


          type="password"


          value={password}


          onChange={(event) => setPassword(event.target.value)}


          placeholder="Votre mot de passe"


          autoComplete="current-password"


          required


          fullWidth


          disabled={submitting}


        />





        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -0.5 }}>


          <Box


            component={RouterLink}


            to="/forgot-password"


            sx={{


              color: "primary.main",


              fontSize: 14,


              fontWeight: 800,


              textDecoration: "none",


              "&:hover": { textDecoration: "underline" },


            }}


          >


            Mot de passe oublié ?


          </Box>


        </Box>


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


              <LogIn size={19} />


            )


          }


          sx={{ mt: 0.5, minHeight: 46 }}


        >


          {submitting ? "Connexion..." : "Se connecter"}


        </Button>


      </Box>


    </AuthPageShell>


  );


}