import {

LayoutDashboard,
Users,
FileText,
CreditCard,
Settings,
User,
LogOut

} from "lucide-react";


import {
NavLink,
useNavigate
} from "react-router-dom";





function Sidebar(){


const navigate=useNavigate();




const menuItems=[


{
name:"Dashboard",
path:"/dashboard",
icon:<LayoutDashboard size={20}/>
},


{
name:"Customers",
path:"/customers",
icon:<Users size={20}/>
},


{
name:"Invoices",
path:"/invoices",
icon:<FileText size={20}/>
},


{
name:"Plans",
path:"/plans",
icon:<CreditCard size={20}/>
},


{
name:"Settings",
path:"/settings",
icon:<Settings size={20}/>
}


];







function logout(){


localStorage.removeItem("loggedIn");


navigate("/login");


}







return(


<aside className="
w-72
min-h-screen
bg-black
text-white
flex
flex-col
p-6
sticky
top-0
shadow-xl
">





{/* Logo */}

<div className="
mb-10
">


<h1 className="
text-3xl
font-bold
text-blue-500
">

🚀 BillSphere

</h1>


<p className="
text-gray-400
text-sm
mt-2
">

Smart Billing Platform

</p>


</div>








{/* Menu */}


<nav className="
flex-1
space-y-3
">


{
menuItems.map((item)=>(


<NavLink


key={item.path}


to={item.path}



className={({isActive})=>

`

flex
items-center
gap-4
px-4
py-3
rounded-xl
transition-all
duration-200


${

isActive

?

"bg-blue-600 text-white shadow-lg"

:

"text-gray-300 hover:bg-gray-800"

}


`

}



>


{item.icon}


<span className="
font-medium
">

{item.name}

</span>



</NavLink>


))


}



</nav>









{/* Bottom */}


<div className="
border-t
border-gray-700
pt-5
space-y-3
">





<button

onClick={()=>navigate("/profile")}

className="
w-full
flex
items-center
gap-4
px-4
py-3
rounded-xl
text-gray-300
hover:bg-gray-800
transition
"

>


<User size={20}/>

Profile


</button>







<button


onClick={logout}


className="
w-full
flex
items-center
gap-4
px-4
py-3
rounded-xl
text-red-400
hover:bg-red-900
transition
"


>


<LogOut size={20}/>

Logout


</button>




</div>





</aside>



)


}


export default Sidebar;