import { useEffect, useState } from "react";


function Settings(){


const user:any = JSON.parse(

localStorage.getItem("user") || "{}"

);



const [form,setForm]=useState({

name:user.name || "",

email:user.email || "",

password:""

});



const [darkMode,setDarkMode]=useState(

localStorage.getItem("theme")==="dark"

);



const [notifications,setNotifications]=useState(true);





// Apply saved theme when page opens

useEffect(()=>{


if(darkMode){

document.documentElement.classList.add("dark");

}

else{

document.documentElement.classList.remove("dark");

}


},[]);







function handleChange(e:any){


setForm({

...form,

[e.target.name]:e.target.value

});


}







function saveSettings(){



const updatedUser={

...user,

name:form.name,

email:form.email

};




localStorage.setItem(

"user",

JSON.stringify(updatedUser)

);




if(form.password){


localStorage.setItem(

"userPassword",

form.password

);


}



alert(
"Settings updated successfully"
);


}









function toggleTheme(){


const value=!darkMode;


setDarkMode(value);



if(value){


document.documentElement.classList.add("dark");


localStorage.setItem(
"theme",
"dark"
);


}

else{


document.documentElement.classList.remove("dark");


localStorage.setItem(
"theme",
"light"
);


}


}







return(


<div>


<h1 className="
text-4xl
font-bold
mb-8
">

Settings ⚙️

</h1>







<div className="
space-y-6
">





{/* Account Settings */}

<div className="
bg-white
rounded-3xl
p-8
shadow
border
">


<h2 className="
text-2xl
font-bold
mb-5
">

Account Settings

</h2>



<div className="
space-y-4
">


<input

name="name"

value={form.name}

onChange={handleChange}

placeholder="Full Name"

className="
w-full
border
p-3
rounded-xl
"

/>



<input

name="email"

value={form.email}

onChange={handleChange}

placeholder="Email"

className="
w-full
border
p-3
rounded-xl
"

/>




<input

name="password"

type="password"

value={form.password}

onChange={handleChange}

placeholder="New Password"

className="
w-full
border
p-3
rounded-xl
"

/>



</div>





<button

onClick={saveSettings}

className="
mt-5
bg-blue-600
text-white
px-6
py-3
rounded-xl
"

>

Save Changes

</button>



</div>









{/* Subscription */}

<div className="
bg-white
rounded-3xl
p-8
shadow
border
">


<h2 className="
text-2xl
font-bold
">

Subscription 💳

</h2>



<p className="
mt-4
text-gray-600
">

Current Plan:

<strong>

{" "}
{user.subscription || "Free"}

</strong>

</p>



</div>









{/* Preferences */}

<div className="
bg-white
rounded-3xl
p-8
shadow
border
">


<h2 className="
text-2xl
font-bold
mb-5
">

Preferences

</h2>






<div className="
flex
justify-between
items-center
mb-5
">


<div>

<h3 className="font-semibold">

Dark Mode 🌙

</h3>


<p className="
text-gray-500
text-sm
">

Change complete website appearance

</p>


</div>




<button

onClick={toggleTheme}

className={

`
px-5
py-2
rounded-xl
text-white

${
darkMode
?
"bg-black"
:
"bg-blue-600"
}

`

}

>


{
darkMode
?
"Dark"
:
"Light"
}


</button>



</div>







<div className="
flex
justify-between
items-center
">


<div>

<h3 className="font-semibold">

Notifications 🔔

</h3>


<p className="
text-gray-500
text-sm
">

Receive billing updates

</p>


</div>



<button

onClick={()=>setNotifications(!notifications)}

className={

`
px-5
py-2
rounded-xl
text-white

${
notifications
?
"bg-green-600"
:
"bg-gray-400"
}

`

}

>


{
notifications
?
"ON"
:
"OFF"
}


</button>



</div>





</div>









{/* Privacy */}

<div className="
bg-white
rounded-3xl
p-8
shadow
border
">


<h2 className="
text-2xl
font-bold
">

Privacy & Security 🔒

</h2>



<p className="
text-gray-500
mt-3
">

Your account information is protected.

</p>



</div>







</div>


</div>


)

}


export default Settings;