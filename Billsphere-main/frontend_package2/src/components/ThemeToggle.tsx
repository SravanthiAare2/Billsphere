import { Moon, Sun } from "lucide-react";
import { useState } from "react";


function ThemeToggle(){

  const [dark,setDark] = useState(false);


  const toggleTheme = () => {

    setDark(!dark);

    if(!dark){
      document.documentElement.classList.add("dark");
    }
    else{
      document.documentElement.classList.remove("dark");
    }

  };


  return (

    <button
      onClick={toggleTheme}
      className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200"
    >

      {
        dark
        ?
        <Sun size={20}/>
        :
        <Moon size={20}/>
      }


    </button>

  );

}


export default ThemeToggle;