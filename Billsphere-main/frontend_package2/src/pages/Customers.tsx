import { useState } from "react";
import { Search, UserPlus, Trash2 } from "lucide-react";



function Customers(){


const user:any = JSON.parse(

localStorage.getItem("user") || "{}"

);



const [customers,setCustomers]=useState<any[]>(

user.customersList || []

);



const [name,setName]=useState("");

const [email,setEmail]=useState("");

const [search,setSearch]=useState("");







function addCustomer(){


if(!name || !email){

alert("Please enter customer details");

return;

}





const newCustomer={


id:Date.now(),

name,

email,

joined:new Date().toLocaleDateString()


};




const updated=[

...customers,

newCustomer

];



setCustomers(updated);





localStorage.setItem(

"user",

JSON.stringify({

...user,

customersList:updated,

customers:updated.length

})

);




setName("");

setEmail("");


}








function deleteCustomer(id:number){



const updated = customers.filter(

(customer)=>customer.id !== id

);



setCustomers(updated);



localStorage.setItem(

"user",

JSON.stringify({

...user,

customersList:updated,

customers:updated.length

})

);



}








const filteredCustomers = customers.filter(

(customer)=>

customer.name
.toLowerCase()
.includes(search.toLowerCase())

);







return(


<div>


{/* Header */}


<div className="
mb-8
">


<h1 className="
text-4xl
font-bold
text-slate-900
dark:text-white
">

Customers 👥

</h1>


<p className="
text-gray-500
mt-2
">

Manage your customers and client information.

</p>


</div>







{/* Add Customer */}



<div className="
bg-white
dark:bg-slate-900
p-8
rounded-3xl
shadow
border
dark:border-slate-700
mb-8
">



<h2 className="
text-2xl
font-bold
mb-5
">

Add New Customer

</h2>





<div className="
grid
md:grid-cols-3
gap-4
">



<input

placeholder="Customer Name"

value={name}

onChange={
e=>setName(e.target.value)
}

className="
border
p-3
rounded-xl
"

/>





<input

placeholder="Customer Email"

value={email}

onChange={
e=>setEmail(e.target.value)
}

className="
border
p-3
rounded-xl
"

/>





<button

onClick={addCustomer}

className="
bg-blue-600
text-white
rounded-xl
flex
items-center
justify-center
gap-2
"

>


<UserPlus size={20}/>

Add Customer

</button>



</div>


</div>










{/* Customer List */}



<div className="
bg-white
dark:bg-slate-900
p-8
rounded-3xl
shadow
border
dark:border-slate-700
">





<div className="
flex
justify-between
items-center
mb-6
">


<h2 className="
text-2xl
font-bold
">

Customer List

</h2>





<div className="
flex
items-center
border
rounded-xl
px-3
">


<Search size={18}/>


<input

placeholder="Search"

value={search}

onChange={
e=>setSearch(e.target.value)
}

className="
p-2
outline-none
"

/>



</div>



</div>







{

filteredCustomers.length===0 ?


<div className="
text-center
py-10
text-gray-500
">

No customers added yet.

</div>


:



<div className="
space-y-4
">


{

filteredCustomers.map((customer)=>(


<div

key={customer.id}

className="
flex
justify-between
items-center
border
p-5
rounded-2xl
"


>



<div>


<h3 className="
font-bold
text-lg
">

{customer.name}

</h3>



<p className="
text-gray-500
">

{customer.email}

</p>



<p className="
text-sm
text-gray-400
">

Joined {customer.joined}

</p>



</div>






<button

onClick={()=>deleteCustomer(customer.id)}

className="
text-red-500
hover:bg-red-100
p-3
rounded-xl
"


>


<Trash2 size={20}/>


</button>





</div>



))


}



</div>



}



</div>






</div>


)

}


export default Customers;