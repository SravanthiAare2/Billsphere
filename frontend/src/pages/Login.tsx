import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Bot,
  CreditCard,
  TrendingUp,
  Check,
} from "lucide-react";


import { loginUser } from "../services/api";
import { useAuth } from "../contexts/AuthContext";




export default function Login(){

const navigate = useNavigate();
const { login } = useAuth();



const [form,setForm] = useState({

email:"",

password:""

});




const [showPassword,setShowPassword] =
useState(false);



const [remember,setRemember] =
useState(false);



const [loading,setLoading] =
useState(false);



const [error,setError] =
useState("");







const handleChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const { name, value } = e.target;

  setForm((prev) => ({
    ...prev,
    [name]: value,
  }));
};





const handleLogin = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  try {
    setLoading(true);
    setError("");

    // ======================================================
    // LOGIN API
    // ======================================================

    const response = await loginUser({
      email: form.email.trim(),
      password: form.password,
    });

    console.log("LOGIN RESPONSE 👉", response);

    // ======================================================
    // CHECK TOKEN
    // ======================================================

    if (!response?.access_token) {
      throw new Error("No access token received");
    }

    // ======================================================
    // UPDATE AUTH CONTEXT
    //
    // IMPORTANT:
    // Do NOT only save the token and navigate.
    // AuthContext must also load the current user.
    // ======================================================

    const user = await login(response.access_token);

    console.log("CURRENT USER AFTER LOGIN 👉", user);

    // ======================================================
    // SAFETY CHECK
    // ======================================================

    if (!user) {
      throw new Error("Unable to load logged-in user");
    }

    // ======================================================
    // SAVE ROLE
    // ======================================================

    localStorage.setItem(
      "role",
      user.role
    );

    // Keep token compatibility with existing code
    localStorage.setItem(
      "access_token",
      response.access_token
    );

    localStorage.setItem(
      "token",
      response.access_token
    );

    // ======================================================
    // ROLE-BASED REDIRECTION
    // ======================================================

    if (user.role === "admin") {

      navigate(
        "/admin/dashboard",
        { replace: true }
      );

    } else if (user.role === "customer") {

      navigate(
        "/customer/dashboard",
        { replace: true }
      );

    } else {

      console.error(
        "Unknown user role:",
        user.role
      );

      setError(
        "Your account role is not configured correctly."
      );
    }

  } catch (err) {

    console.error(
      "LOGIN ERROR 👉",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Invalid email or password"
    );

  } finally {

    setLoading(false);

  }
};








return(


<div style={styles.page}>





<Link
to="/"
style={styles.back}
>

<ArrowLeft size={18}/>

Back

</Link>






<div style={styles.oliveGlow}></div>

<div style={styles.bronzeGlow}></div>









<div style={styles.container}>


{/* LEFT SHOWCASE */}


<div style={styles.showcase}>



<div style={styles.brand}>


<div style={styles.logoCircle}>
B
</div>


<span>
BillSphere
</span>


</div>







<h1 style={styles.heading}>


Welcome back to


<br/>


<span style={styles.gradient}>
intelligent billing.
</span>


</h1>







<p style={styles.description}>


Manage subscriptions,
invoices and payments
from one powerful AI
billing platform.


</p>







{/* AI CARD */}



<div style={styles.dashboardCard}>


<div style={styles.cardHeader}>


<Bot size={20}/>


AI Billing Assistant


</div>







<div style={styles.revenue}>


<div>

<small>
Monthly Revenue
</small>


<h2 style={styles.revenueValue}>
₹24,85,500
</h2>


</div>



<TrendingUp
size={38}
/>


</div>








<div style={styles.analytics}>


<span style={{...styles.analyticsBar, height:"45%"}}></span>

<span style={{...styles.analyticsBar, height:"70%"}}></span>

<span style={{...styles.analyticsBar, height:"55%"}}></span>

<span style={{...styles.analyticsBar, height:"90%"}}></span>

<span style={{...styles.analyticsBar, height:"65%"}}></span>


</div>






<div style={styles.cardFooter}>


<div>

<CreditCard size={16}/>

12,450 Active

</div>



<div>

<Check size={16}/>

98% Success

</div>



</div>



</div>









<div style={styles.security}>


<div style={styles.securityItem}>

<ShieldCheck size={22}/>

<div>

<strong>
Enterprise Security
</strong>

<small>
256-bit encryption
</small>

</div>


</div>





<div style={styles.securityItem}>

<Sparkles size={22}/>

<div>

<strong>
AI Automation
</strong>

<small>
Smart workflows
</small>

</div>


</div>




</div>








</div>









{/* LOGIN CARD */}





<div style={styles.card}>


<form
onSubmit={handleLogin}
>


<h2>
Sign In
</h2>


<p style={styles.subtitle}>

Access your BillSphere dashboard

</p>







{
error &&

<div style={styles.error}>

{error}

</div>

}







<div style={styles.inputGroup}>


<label style={styles.label}>
Email Address
</label>


<div style={styles.inputBox}>


<Mail size={18}/>



<input

style={styles.input}

name="email"

type="email"

placeholder="Enter your email"

value={form.email}

onChange={handleChange}

required

/>


</div>



</div>









<div style={styles.inputGroup}>


<label style={styles.label}>
Password
</label>



<div style={styles.inputBox}>


<Lock size={18}/>



<input


style={styles.input}


name="password"


type={
showPassword
?
"text"
:
"password"
}


placeholder="Enter password"


value={form.password}


onChange={handleChange}


required



/>



<button

type="button"

style={styles.eye}

onClick={
()=>setShowPassword(
!showPassword
)
}

>


{
showPassword

?

<EyeOff/>

:

<Eye/>

}


</button>



</div>


</div>







<div style={styles.options}>


<label style={styles.rememberLabel}>


<input

type="checkbox"

checked={remember}

onChange={
e=>
setRemember(
e.target.checked
)
}

/>


Remember me


</label>





<Link
to="/forgot-password"
style={styles.forgot}
>

Forgot Password?

</Link>


</div>








<button

style={styles.button}

disabled={loading}

>


{
loading

?

"Signing in..."

:

<>

Login

<ArrowRight size={18}/>

</>

}



</button>









<p style={styles.bottom}>


Don't have an account?


<Link
to="/register"
style={styles.bottomLink}
>

Create Account

</Link>


</p>






</form>


</div>








</div>



</div>


);


}


const styles:any = {


page:{

minHeight:"100vh",

background:
"radial-gradient(circle at top left,#2f3a12,#0a0a06 45%,#050503)",

color:"#f7f2e2",

fontFamily:
"Inter,Arial,sans-serif",

overflow:"hidden",

position:"relative"

},





back:{

position:"absolute",

top:"35px",

left:"45px",

display:"flex",

alignItems:"center",

gap:"8px",

color:"#a6a290",

textDecoration:"none",

zIndex:5

},





oliveGlow:{

position:"absolute",

width:"650px",

height:"650px",

background:
"radial-gradient(circle,#5a6b2855,transparent 70%)",

top:"-200px",

left:"-150px",

filter:"blur(80px)"

},






bronzeGlow:{

position:"absolute",

width:"500px",

height:"500px",

background:
"radial-gradient(circle,#d4af3733,transparent 70%)",

right:"-150px",

bottom:"-150px",

filter:"blur(90px)"

},






container:{

minHeight:"100vh",

display:"grid",

gridTemplateColumns:
"1fr 430px",

gap:"90px",

alignItems:"center",

padding:
"60px 100px"

},






showcase:{

maxWidth:"600px"

},





brand:{

display:"flex",

alignItems:"center",

gap:"12px",

fontSize:"24px",

fontWeight:800

},






logoCircle:{

width:"48px",

height:"48px",

borderRadius:"50%",

background:
"linear-gradient(135deg,#d4af37,#f7f2e2)",

display:"flex",

alignItems:"center",

justifyContent:"center",

color:"#111",

fontSize:"22px",

fontWeight:900

},






heading:{

fontSize:"64px",

lineHeight:"1",

letterSpacing:"-3px",

marginTop:"50px"

},





description:{

color:"#a6a290",

fontSize:"18px",

lineHeight:"1.7",

marginTop:"25px",

maxWidth:"480px"

},






dashboardCard:{

marginTop:"40px",

padding:"25px",

borderRadius:"28px",

background:
"rgba(255,255,255,.06)",

border:
"1px solid rgba(143,174,74,.22)",

backdropFilter:
"blur(25px)",

boxShadow:
"0 40px 100px rgba(0,0,0,.5)"

},






cardHeader:{

display:"flex",

alignItems:"center",

gap:"10px",

color:"#e8d9a0",

fontWeight:700

},






revenue:{

display:"flex",

justifyContent:"space-between",

alignItems:"center",

marginTop:"25px"

},






revenueValue:{

fontSize:"34px",

margin:0

},






analytics:{

height:"70px",

display:"flex",

alignItems:"end",

gap:"8px",

marginTop:"20px"

},





analyticsBar:{

width:"14px",

background:
"linear-gradient(#d4af37,#5a6b28)",

borderRadius:"10px"

},






cardFooter:{

display:"flex",

justifyContent:"space-between",

marginTop:"20px",

color:"#a6a290",

fontSize:"13px"

},






security:{

display:"flex",

gap:"18px",

marginTop:"25px"

},





securityItem:{

display:"flex",

gap:"10px",

padding:"15px",

borderRadius:"18px",

background:
"rgba(255,255,255,.04)",

border:
"1px solid rgba(143,174,74,.18)",

color:"#e8d9a0",

flex:1

},






card:{

background:
"rgba(255,255,255,.05)",

border:
"1px solid rgba(143,174,74,.22)",

backdropFilter:
"blur(30px)",

borderRadius:"32px",

padding:"38px",

boxShadow:
"0 40px 100px rgba(0,0,0,.6), 0 0 60px rgba(184,137,90,.08)"

},






subtitle:{

color:"#a6a290",

marginBottom:"30px"

},






inputGroup:{

marginBottom:"20px"

},





label:{

fontSize:"13px",

color:"#a6a290",

display:"block",

marginBottom:"8px"

},






inputBox:{

height:"52px",

display:"flex",

alignItems:"center",

gap:"12px",

background:
"rgba(0,0,0,.45)",

border:
"1px solid rgba(143,174,74,.2)",

borderRadius:"16px",

padding:"0 15px",

color:"#a6a290"

},






input:{

background:"transparent",

border:"none",

outline:"none",

color:"#f7f2e2",

width:"100%",

fontSize:"15px"

},





eye:{

background:"none",

border:"none",

color:"#a6a290",

cursor:"pointer",

display:"flex"

},






options:{

display:"flex",

justifyContent:"space-between",

alignItems:"center",

color:"#a6a290",

fontSize:"13px",

marginBottom:"25px"

},





rememberLabel:{

display:"flex",

alignItems:"center",

gap:"8px"

},






forgot:{

color:"#e8d9a0",

textDecoration:"none"

},






button:{

width:"100%",

height:"54px",

border:"none",

borderRadius:"30px",

background:
"linear-gradient(100deg,#f7f2e2,#e8d9a0 30%,#d4af37 55%,#b8895a 75%,#5a6b28)",

fontWeight:800,

fontSize:"16px",

display:"flex",

justifyContent:"center",

alignItems:"center",

gap:"10px",

cursor:"pointer",

color:"#0a0a06",

boxShadow:"0 0 40px rgba(184,137,90,.4)"

},






error:{

background:
"rgba(255,70,70,.15)",

border:
"1px solid #ff7070",

padding:"14px",

borderRadius:"15px",

color:"#ff9b9b",

marginBottom:"20px"

},






bottom:{

textAlign:"center",

color:"#a6a290",

marginTop:"25px"

},





bottomLink:{

color:"#e8d9a0",

textDecoration:"none",

fontWeight:700,

marginLeft:"5px"

},


gradient:{
 background:"linear-gradient(90deg,#f7f2e2,#e8d9a0,#d4af37,#b8895a)",
 WebkitBackgroundClip:"text",
 color:"transparent"
}


};