// src/pages/Dashboard.tsx

import {
  DollarSign,
  CreditCard,
  FileText,
  TrendingUp,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Bot,
  ShieldCheck,
  Zap,
  ArrowLeft,
} from "lucide-react";

import { Link } from "react-router-dom";



export default function Dashboard() {



const stats = [

{
title:"Total Revenue",
value:"₹24,85,500",
change:"+24.8%",
positive:true,
icon:<DollarSign size={22}/>
},


{
title:"Active Subscriptions",
value:"12,450",
change:"+18.2%",
positive:true,
icon:<CreditCard size={22}/>
},


{
title:"Payment Success",
value:"98.6%",
change:"+5.4%",
positive:true,
icon:<CheckCircle2 size={22}/>
},


{
title:"Invoices Generated",
value:"8,240",
change:"+12.1%",
positive:true,
icon:<FileText size={22}/>
}

];







const transactions=[

{
customer:"Nova Labs",
plan:"Enterprise Plan",
amount:"₹25,000",
status:"Paid"
},

{
customer:"Cloudify",
plan:"Pro Plan",
amount:"₹8,999",
status:"Paid"
},
  
{
customer:"TechVerse",
plan:"Starter Plan",
amount:"₹499",
status:"Pending"
},

{
customer:"AI Solutions",
plan:"Enterprise Plan",
amount:"₹35,000",
status:"Paid"
}

];






return(


<div style={styles.page}>


<div style={styles.glowOne}></div>

<div style={styles.glowTwo}></div>





<div style={styles.container}>





{/* NAV */}



<div style={styles.nav}>

  <Link to="/" style={styles.back}>
    <ArrowLeft size={18} />
    Back
  </Link>

  <div style={styles.logo}>
    <div style={styles.logoCircle}>B</div>
    BillSphere
  </div>

  <Link to="/register" style={styles.button}>
    Start Free Trial
  </Link>

</div>







{/* HEADER */}



<div style={styles.header}>


<div>


<div style={styles.badge}>

<Sparkles size={15}/>

Live Demo Dashboard

</div>



<h1>

AI Billing

<span>
 Dashboard Preview
</span>

</h1>



<p>

Experience how BillSphere manages
subscriptions, invoices and payments
intelligently.

</p>


</div>






<div style={styles.aiBadge}>

<Bot size={20}/>

AI Analytics Active

</div>



</div>









{/* STATS */}



<div style={styles.statsGrid}>


{
stats.map(
(item,index)=>(


<div
key={index}
style={styles.card}
>


<div style={styles.cardTop}>


<div style={styles.iconBox}>

{item.icon}

</div>





<div
style={
item.positive
?
styles.green
:
styles.red
}
>


<ArrowUpRight size={15}/>

{item.change}


</div>


</div>





<p style={styles.label}>
{item.title}
</p>



<h2>
{item.value}
</h2>



</div>



)

)

}



</div>









{/* ANALYTICS */}




<div style={styles.middleGrid}>


<div style={styles.card}>


<div style={styles.sectionHeader}>


<div>


<h3>
Revenue Growth
</h3>


<p>
Monthly SaaS performance
</p>


</div>



<TrendingUp/>

</div>







<div style={styles.chart}>


{
[35,55,45,75,65,90,80]
.map(
(height,index)=>(


<div

key={index}

style={{
...styles.bar,
height:`${height}%`
}}

></div>


)

)

}



</div>






<div style={styles.growth}>

<TrendingUp size={18}/>

Revenue increased 24.8%

</div>


</div>








<div style={styles.card}>


<h3>
Subscription Status
</h3>



<Status

icon={<CheckCircle2/>}

name="Active"

value="9,850"

/>



<Status

icon={<Clock/>}

name="Trial"

value="1,850"

/>




<Status

icon={<AlertCircle/>}

name="Cancelled"

value="750"

/>



</div>




</div>









{/* AI INSIGHT */}




<div style={styles.aiCard}>


<div style={styles.aiIcon}>

<Bot size={28}/>

</div>



<div>


<h3>
BillSphere AI Insight
</h3>


<p>

Revenue increased by 24.8%.
Failed payments reduced by 18%.

</p>


<div style={styles.recommend}>

<Zap size={15}/>

Recommendation:
Optimize premium plans

</div>


</div>



</div>









{/* SECURITY */}



<div style={styles.security}>


<ShieldCheck/>

Bank Grade Security

</div>








{/* TRANSACTIONS */}



<div style={styles.card}>


<div style={styles.sectionHeader}>


<div>

<h3>
Recent Payments
</h3>


<p>
Latest customer billing activity
</p>


</div>



<Activity/>

</div>





{
transactions.map(
(item,index)=>(


<div
key={index}
style={styles.row}
>



<div>

<h4>
{item.customer}
</h4>


<span>
{item.plan}
</span>


</div>




<strong>

{item.amount}

</strong>





<div

style={
item.status==="Paid"
?
styles.paid
:
styles.pending
}

>

{item.status}

</div>



</div>


)

)

}



</div>






</div>



</div>


)

}






function Status(
{
icon,
name,
value
}:any
){


return(

<div style={styles.statusBox}>


<div style={styles.statusLeft}>

{icon}

{name}

</div>


<strong>
{value}
</strong>


</div>


)

}
const styles:any={


page:{

minHeight:"100vh",

background:
"radial-gradient(circle at top left,#32135f,#050505 45%)",

color:"#fff",

padding:"35px 60px",

fontFamily:"Inter,Arial,sans-serif",

position:"relative",

overflow:"hidden"

},

back:{
  display:"flex",
  alignItems:"left",
  gap:"6px",
  color:"#e8d9a0",
  textDecoration:"none",
  fontWeight:600,
},



container:{

position:"relative",

zIndex:2

},




glowOne:{

position:"absolute",

width:"500px",

height:"500px",

background:
"rgba(245,197,66,.18)",

filter:"blur(140px)",

top:"-150px",

right:"5%"

},




glowTwo:{

position:"absolute",

width:"450px",

height:"450px",

background:
"rgba(124,58,237,.25)",

filter:"blur(150px)",

bottom:"-150px",

left:"10%"

},






nav:{

display:"flex",

justifyContent:"space-between",

alignItems:"center",

paddingBottom:"30px",

borderBottom:
"1px solid rgba(255,255,255,.08)"

},




logo:{

display:"flex",

alignItems:"center",

gap:"12px",

fontSize:"24px",

fontWeight:800,

letterSpacing:"1px"

},




logoCircle:{

width:"42px",

height:"42px",

borderRadius:"50%",

background:
"linear-gradient(135deg,#f7c85d,#fff1a8)",

display:"flex",

alignItems:"center",

justifyContent:"center",

color:"#111",

fontWeight:800

},





button:{

padding:"12px 26px",

borderRadius:"30px",

background:
"linear-gradient(90deg,#f7c85d,#ffeaa3)",

color:"#111",

textDecoration:"none",

fontWeight:700

},






header:{

display:"flex",

justifyContent:"space-between",

alignItems:"center",

marginTop:"50px",

marginBottom:"35px"

},




badge:{

display:"inline-flex",

alignItems:"center",

gap:"8px",

padding:"8px 16px",

borderRadius:"30px",

background:
"rgba(255,255,255,.06)",

border:
"1px solid rgba(255,255,255,.12)",

color:"#f7c85d",

fontSize:"13px"

},




aiBadge:{

display:"flex",

alignItems:"center",

gap:"10px",

padding:"14px 22px",

borderRadius:"30px",

background:
"rgba(245,197,66,.12)",

border:
"1px solid rgba(245,197,66,.3)",

color:"#f7c85d"

},





statsGrid:{

display:"grid",

gridTemplateColumns:
"repeat(4,1fr)",

gap:"22px"

},






card:{

background:
"rgba(255,255,255,.07)",

border:
"1px solid rgba(255,255,255,.12)",

backdropFilter:
"blur(25px)",

borderRadius:"25px",

padding:"25px",

marginBottom:"25px",

boxShadow:
"0 25px 60px rgba(0,0,0,.35)"

},





cardTop:{

display:"flex",

justifyContent:"space-between",

alignItems:"center"

},





iconBox:{

width:"50px",

height:"50px",

borderRadius:"16px",

background:
"linear-gradient(135deg,#f7c85d,#d97706)",

display:"flex",

alignItems:"center",

justifyContent:"center",

color:"#111"

},




label:{

color:"#94a3b8",

marginTop:"20px"

},





green:{

display:"flex",

alignItems:"center",

gap:"5px",

color:"#4ade80"

},




red:{

display:"flex",

alignItems:"center",

gap:"5px",

color:"#f87171"

},






middleGrid:{

display:"grid",

gridTemplateColumns:
"2fr 1fr",

gap:"25px",

marginTop:"30px"

},





sectionHeader:{

display:"flex",

justifyContent:"space-between",

alignItems:"center"

},





chart:{

height:"230px",

display:"flex",

alignItems:"end",

gap:"15px",

marginTop:"30px"

},





bar:{

flex:1,

background:
"linear-gradient(to top,#f7c85d,#7c3aed)",

borderRadius:"12px 12px 0 0",

boxShadow:
"0 0 25px rgba(245,197,66,.3)"

},






growth:{

marginTop:"20px",

display:"flex",

alignItems:"center",

gap:"8px",

color:"#4ade80"

},






statusBox:{

display:"flex",

justifyContent:"space-between",

alignItems:"center",

padding:"16px",

marginTop:"15px",

background:
"rgba(255,255,255,.05)",

borderRadius:"16px"

},





statusLeft:{

display:"flex",

alignItems:"center",

gap:"10px"

},





aiCard:{

display:"flex",

gap:"20px",

alignItems:"center",

background:
"linear-gradient(135deg,rgba(124,58,237,.25),rgba(245,197,66,.12))",

border:
"1px solid rgba(255,255,255,.15)",

padding:"28px",

borderRadius:"28px",

marginBottom:"25px"

},




aiIcon:{

width:"60px",

height:"60px",

borderRadius:"20px",

background:
"linear-gradient(135deg,#f7c85d,#fff)",

color:"#111",

display:"flex",

alignItems:"center",

justifyContent:"center"

},




recommend:{

marginTop:"12px",

display:"flex",

gap:"8px",

alignItems:"center",

color:"#f7c85d"

},




security:{

display:"flex",

alignItems:"center",

gap:"10px",

padding:"18px",

marginBottom:"25px",

borderRadius:"20px",

background:
"rgba(72,255,155,.08)",

color:"#48ff9b"

},





row:{

display:"grid",

gridTemplateColumns:
"2fr 1fr 100px",

alignItems:"center",

padding:"18px 0",

borderBottom:
"1px solid rgba(255,255,255,.1)"

},




paid:{

color:"#4ade80",

fontWeight:700

},




pending:{

color:"#facc15",

fontWeight:700

}



};
