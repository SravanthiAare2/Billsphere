import { useState } from "react";
import {
  FilePlus,
  Trash2,
  Search
} from "lucide-react";



function Invoices(){


const user:any = JSON.parse(

localStorage.getItem("user") || "{}"

);



const [invoices,setInvoices]=useState<any[]>(

user.invoicesList || []

);



const [customer,setCustomer]=useState("");

const [amount,setAmount]=useState("");

const [status,setStatus]=useState("Pending");

const [search,setSearch]=useState("");






function createInvoice(){


if(!customer || !amount){

alert("Please enter invoice details");

return;

}




const newInvoice={


id:Date.now(),

customer,

amount,

status,

date:new Date().toLocaleDateString()


};





const updated=[

...invoices,

newInvoice

];




setInvoices(updated);





const totalRevenue = updated

.filter(
(item)=>item.status==="Paid"
)

.reduce(

(sum,item)=>sum + Number(item.amount),

0

);






localStorage.setItem(

"user",

JSON.stringify({

...user,

invoicesList:updated,

invoices:updated.length,

revenue:`$${totalRevenue}`

})

);





setCustomer("");

setAmount("");

setStatus("Pending");



}








function deleteInvoice(id:number){



const updated = invoices.filter(

(invoice)=>invoice.id!==id

);



setInvoices(updated);



const totalRevenue = updated

.filter(
(item)=>item.status==="Paid"
)

.reduce(

(sum,item)=>sum + Number(item.amount),

0

);





localStorage.setItem(

"user",

JSON.stringify({

...user,

invoicesList:updated,

invoices:updated.length,

revenue:`$${totalRevenue}`

})

);



}







const filteredInvoices=invoices.filter(

(invoice)=>

invoice.customer
.toLowerCase()
.includes(search.toLowerCase())


);








return(


<div>



<div className="
mb-8
">


<h1 className="
text-4xl
font-bold
text-slate-900
dark:text-white
">

Invoices 🧾

</h1>



<p className="
text-gray-500
mt-2
">

Create and manage your business invoices.

</p>



</div>









{/* Create Invoice */}



<div className="
bg-white
dark:bg-slate-900
rounded-3xl
p-8
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

Create New Invoice

</h2>






<div className="
grid
md:grid-cols-4
gap-4
">



<input

placeholder="Customer Name"

value={customer}

onChange={
e=>setCustomer(e.target.value)
}

className="
border
p-3
rounded-xl
"

/>






<input

placeholder="Amount"

type="number"

value={amount}

onChange={
e=>setAmount(e.target.value)
}

className="
border
p-3
rounded-xl
"

/>







<select

value={status}

onChange={
e=>setStatus(e.target.value)
}

className="
border
p-3
rounded-xl
"

>


<option>

Pending

</option>


<option>

Paid

</option>



</select>








<button

onClick={createInvoice}

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


<FilePlus size={20}/>

Create

</button>





</div>



</div>









{/* Invoice List */}



<div className="
bg-white
dark:bg-slate-900
rounded-3xl
p-8
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

Invoice History

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

placeholder="Search customer"

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

filteredInvoices.length===0 ?


<div className="
text-center
py-10
text-gray-500
">

No invoices created yet.

</div>


:


<div className="
space-y-4
">


{

filteredInvoices.map((invoice)=>(


<div

key={invoice.id}

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

{invoice.customer}

</h3>



<p className="
text-gray-500
">

Amount: ${invoice.amount}

</p>



<p className="
text-sm
text-gray-400
">

{invoice.date}

</p>


</div>







<div className="
flex
items-center
gap-4
">



<span

className={

`
px-4
py-2
rounded-xl
text-sm

${
invoice.status==="Paid"

?

"bg-green-100 text-green-700"

:

"bg-yellow-100 text-yellow-700"

}

`

}

>

{invoice.status}

</span>







<button

onClick={()=>deleteInvoice(invoice.id)}

className="
text-red-500
p-3
rounded-xl
hover:bg-red-100
"

>

<Trash2 size={20}/>

</button>




</div>



</div>



))


}



</div>



}




</div>







</div>


)

}


export default Invoices;