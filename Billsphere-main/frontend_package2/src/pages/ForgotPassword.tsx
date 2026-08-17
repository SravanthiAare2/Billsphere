import { useState } from "react";
import { useNavigate } from "react-router-dom";


function ForgotPassword(){


const navigate = useNavigate();



const [email,setEmail]=useState("");

const [password,setPassword]=useState("");

const [confirmPassword,setConfirmPassword]=useState("");

const [message,setMessage]=useState("");






function resetPassword(){



const user:any = JSON.parse(

localStorage.getItem("user") || "null"

);





if(!user || user.email !== email){


setMessage(
"Email not found"
);


return;

}






if(password !== confirmPassword){


setMessage(
"Passwords do not match"
);


return;

}






const updatedUser={

...user,

password:password

};





localStorage.setItem(

"user",

JSON.stringify(updatedUser)

);





alert(
"Password updated successfully"
);



navigate("/login");


}







return(


<div className="
min-h-screen
flex
items-center
justify-center
bg-slate-100
">


<div className="
bg-white
p-10
rounded-3xl
shadow
w-full
max-w-md
">



<h1 className="
text-3xl
font-bold
text-center
">

Reset Password 🔐

</h1>




<p className="
text-gray-500
text-center
mt-2
">

Create your new password

</p>







{
message &&

<div className="
mt-5
bg-red-100
text-red-600
p-3
rounded-xl
">

{message}

</div>

}






<input

placeholder="Registered Email"

value={email}

onChange={
e=>setEmail(e.target.value)
}

className="
w-full
border
p-3
rounded-xl
mt-6
"

/>






<input

type="password"

placeholder="New Password"

value={password}

onChange={
e=>setPassword(e.target.value)
}

className="
w-full
border
p-3
rounded-xl
mt-4
"

/>







<input

type="password"

placeholder="Confirm Password"

value={confirmPassword}

onChange={
e=>setConfirmPassword(e.target.value)
}

className="
w-full
border
p-3
rounded-xl
mt-4
"

/>







<button

onClick={resetPassword}

className="
mt-6
w-full
bg-blue-600
text-white
py-3
rounded-xl
"

>

Save Password

</button>





</div>


</div>


)

}


export default ForgotPassword;