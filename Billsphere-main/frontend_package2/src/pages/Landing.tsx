import { Link } from "react-router-dom";



function Landing(){


return(


<div className="
min-h-screen
bg-slate-100
">


<section className="
text-center
py-24
px-6
">



<h1 className="
text-6xl
font-bold
text-slate-900
">

BillSphere 🚀

</h1>



<p className="
mt-6
text-2xl
text-blue-600
font-semibold
">

Smart Billing & Subscription Management Platform

</p>




<p className="
max-w-3xl
mx-auto
mt-6
text-gray-600
text-lg
">

Manage invoices, customers, subscriptions and business growth
with one powerful billing solution.

</p>







<Link

to="/register"

className="
inline-block
mt-10
bg-blue-600
text-white
px-10
py-4
rounded-2xl
text-lg
font-semibold
hover:bg-blue-700
"

>

Get Started

</Link>





</section>






<section className="
grid
md:grid-cols-3
gap-8
max-w-6xl
mx-auto
px-8
pb-20
">





<div className="
bg-white
p-8
rounded-3xl
shadow
">

<h2 className="
text-xl
font-bold
">

Easy Billing

</h2>


<p className="
text-gray-500
mt-3
">

Create and manage invoices easily.

</p>


</div>







<div className="
bg-white
p-8
rounded-3xl
shadow
">

<h2 className="
text-xl
font-bold
">

Customer Management

</h2>


<p className="
text-gray-500
mt-3
">

Keep all customer details organized.

</p>


</div>







<div className="
bg-white
p-8
rounded-3xl
shadow
">

<h2 className="
text-xl
font-bold
">

Subscription Tracking

</h2>


<p className="
text-gray-500
mt-3
">

Manage plans and recurring payments.

</p>


</div>




</section>




</div>


)

}


export default Landing;