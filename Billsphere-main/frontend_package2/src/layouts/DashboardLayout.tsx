import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";


function DashboardLayout(){


return(

<div className="
flex
min-h-screen
bg-slate-100
dark:bg-slate-950
">


<Sidebar />



<main className="
flex-1
p-8
overflow-y-auto
transition-all
duration-300
">


<Outlet />


</main>



</div>


)

}


export default DashboardLayout;