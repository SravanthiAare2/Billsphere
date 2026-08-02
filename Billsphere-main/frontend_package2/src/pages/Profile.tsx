import { useState } from "react";
import { Camera, Save } from "lucide-react";



function Profile(){


const user:any = JSON.parse(

localStorage.getItem("user") || "{}"

);





const [edit,setEdit]=useState(false);



const [profile,setProfile]=useState({


name:user.name || "User",

email:user.email || "",

phone:user.phone || "",

about:user.about || "",

image:user.image || "",

joined:user.created_at || 
new Date().toLocaleDateString(),

subscription:user.subscription || "Free"


});









function handleChange(e:any){


setProfile({

...profile,

[e.target.name]:e.target.value

});


}








function imageUpload(e:any){


const file=e.target.files[0];


if(file){


const reader=new FileReader();



reader.onload=()=>{


setProfile({

...profile,

image:reader.result as string

});


};



reader.readAsDataURL(file);


}


}








function saveProfile(){



const updatedUser={

...user,

...profile

};





localStorage.setItem(

"user",

JSON.stringify(updatedUser)

);



setEdit(false);


alert(
"Profile updated successfully"
);


}








return(


<div>


<h1 className="
text-4xl
font-bold
mb-8
text-slate-900
dark:text-white
">

Profile 👤

</h1>







<div className="
max-w-3xl
bg-white
dark:bg-slate-900
rounded-3xl
shadow
border
dark:border-slate-700
p-8
">







{/* Image */}


<div className="
flex
items-center
gap-6
mb-8
">


<div>


{

profile.image ?


<img

src={profile.image}

className="
w-28
h-28
rounded-full
object-cover
"

/>


:


<div className="
w-28
h-28
rounded-full
bg-blue-600
text-white
flex
items-center
justify-center
text-5xl
font-bold
">

{

profile.name.charAt(0).toUpperCase()

}

</div>


}



</div>







{

edit &&

<label className="
cursor-pointer
bg-blue-600
text-white
px-5
py-3
rounded-xl
flex
items-center
gap-2
">


<Camera size={18}/>

Upload Image


<input

type="file"

hidden

accept="image/*"

onChange={imageUpload}

/>


</label>


}





</div>









{/* Details */}



<div className="
space-y-5
">





<input

name="name"

disabled={!edit}

value={profile.name}

onChange={handleChange}

className="
w-full
border
p-3
rounded-xl
"

/>





<input

name="email"

disabled={!edit}

value={profile.email}

onChange={handleChange}

className="
w-full
border
p-3
rounded-xl
"

/>






<input

name="phone"

disabled={!edit}

value={profile.phone}

onChange={handleChange}

placeholder="Phone Number"

className="
w-full
border
p-3
rounded-xl
"

/>






<textarea

name="about"

disabled={!edit}

value={profile.about}

onChange={handleChange}

placeholder="About yourself"

className="
w-full
border
p-3
rounded-xl
"

/>





</div>









{/* Info */}



<div className="
mt-8
grid
md:grid-cols-2
gap-5
">



<div className="
bg-slate-100
dark:bg-slate-800
p-5
rounded-2xl
">


<h3 className="
font-semibold
">

Subscription

</h3>


<p className="
mt-2
text-gray-500
">

{profile.subscription}

</p>


</div>







<div className="
bg-slate-100
dark:bg-slate-800
p-5
rounded-2xl
">


<h3 className="
font-semibold
">

Joined On

</h3>


<p className="
mt-2
text-gray-500
">

{profile.joined}

</p>


</div>




</div>









{/* Buttons */}


{

edit ?


<button

onClick={saveProfile}

className="
mt-8
bg-green-600
text-white
px-8
py-3
rounded-xl
flex
items-center
gap-2
"

>


<Save size={18}/>

Save Profile


</button>



:


<button

onClick={()=>setEdit(true)}

className="
mt-8
bg-blue-600
text-white
px-8
py-3
rounded-xl
"

>

Edit Profile

</button>



}





</div>



</div>


)

}


export default Profile;