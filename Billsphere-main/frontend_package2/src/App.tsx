import {
  BrowserRouter,
  Routes,
  Route,
  useLocation
} from "react-router-dom";

import { useEffect } from "react";


import Navbar from "./components/Navbar";


import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";


import DashboardLayout from "./layouts/DashboardLayout";


import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Plans from "./pages/Plans";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";





function AppContent(){


const location = useLocation();



// Load saved theme

useEffect(()=>{


const theme =
localStorage.getItem("theme");


if(theme==="dark"){

document.documentElement.classList.add("dark");

}

else{

document.documentElement.classList.remove("dark");

}


},[]);





const publicPages=[

"/",
"/login",
"/register"

];



const showNavbar =
publicPages.includes(location.pathname);






return(

<>


{
showNavbar && <Navbar/>
}




<Routes>


{/* Public */}

<Route

path="/"

element={<Landing/>}

/>



<Route

path="/login"

element={<Login/>}

/>




<Route

path="/register"

element={<Register/>}

/>





{/* Dashboard */}

<Route element={<DashboardLayout/>}>


<Route

path="/dashboard"

element={<Dashboard/>}

/>



<Route

path="/customers"

element={<Customers/>}

/>



<Route

path="/invoices"

element={<Invoices/>}

/>



<Route

path="/plans"

element={<Plans/>}

/>



<Route

path="/settings"

element={<Settings/>}

/>



<Route

path="/profile"

element={<Profile/>}

/>


</Route>





<Route

path="/forgot-password"

element={<ForgotPassword/>}

/>



</Routes>


</>


)

}






function App(){


return(

<BrowserRouter>

<AppContent/>

</BrowserRouter>

)

}



export default App;