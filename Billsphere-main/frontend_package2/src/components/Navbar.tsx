import { Link } from "react-router-dom";


function Navbar(){


return(

<nav className="
w-full
bg-white
shadow-sm
px-8
py-5
flex
justify-between
items-center
">


{/* Logo */}

<Link

to="/"

className="
text-3xl
font-bold
text-blue-600
"

>

🚀 BillSphere

</Link>





{/* Right Buttons */}

<div className="
flex
gap-4
items-center
">


<Link

to="/login"

className="
px-5
py-2
rounded-xl
text-gray-700
hover:text-blue-600
font-medium
"

>

Login

</Link>





<Link

to="/register"

className="
bg-blue-600
text-white
px-6
py-3
rounded-xl
hover:bg-blue-700
font-medium
"

>

Register

</Link>



</div>


</nav>


)

}


export default Navbar;