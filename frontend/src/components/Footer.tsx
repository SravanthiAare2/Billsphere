import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

function Footer() {
  return (
    <footer
      className="
      relative
      mt-24
      overflow-hidden
      border-t
      border-[#8fae4a]/20
      bg-[#050503]
      px-6
      py-16
      text-[#f7f2e2]
      "
    >

      {/* Multi-tone spotlight glow — same as landing hero */}

      <div
        className="
        absolute inset-0
        bg-[radial-gradient(ellipse_800px_300px_at_50%_-10%,rgba(143,174,74,0.18),transparent_60%),radial-gradient(ellipse_600px_300px_at_20%_100%,rgba(184,137,90,0.14),transparent_60%),radial-gradient(ellipse_600px_300px_at_80%_100%,rgba(212,175,55,0.1),transparent_60%)]
        "
      />


      <div
        className="
        relative
        mx-auto
        flex
        max-w-7xl
        flex-col
        gap-10
        "
      >


        {/* Brand */}


        <div
          className="
          flex
          flex-col
          items-center
          text-center
          "
        >

          <div
            className="
            flex
            items-center
            gap-3
            text-2xl
            font-black
            "
          >

            <div
              className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-gradient-to-br
              from-[#f7f2e2]
              via-[#d4af37]
              to-[#2f3a12]
              text-black
              shadow-[0_0_40px_rgba(184,137,90,.5)]
              pulse-ring
              "
            >
              BS
            </div>


            <span className="gold-text">
              BillSphere
            </span>

          </div>


          <p
            className="
            mt-3
            text-sm
            text-[#a6a290]
            "
          >
            Revenue Automation Platform
          </p>


        </div>


        <div className="divider-glow" />


        {/* Links */}


        <div
          className="
          flex
          flex-wrap
          justify-center
          gap-x-8
          gap-y-4
          text-sm
          text-[#a6a290]
          "
        >

          <Link
            to="/"
            className="
            hover:text-[#e8d9a0]
            transition
            "
          >
            Features
          </Link>


          <Link
            to="/"
            className="
            hover:text-[#e8d9a0]
            transition
            "
          >
            Pricing
          </Link>


          <Link
            to="/"
            className="
            hover:text-[#e8d9a0]
            transition
            "
          >
            Documentation
          </Link>


          <Link
            to="/"
            className="
            hover:text-[#e8d9a0]
            transition
            "
          >
            API
          </Link>


          <Link
            to="/"
            className="
            hover:text-[#e8d9a0]
            transition
            "
          >
            Support
          </Link>


          <Link
            to="/"
            className="
            hover:text-[#e8d9a0]
            transition
            "
          >
            Privacy
          </Link>


        </div>




        {/* Bottom */}


        <div
          className="
          flex
          items-center
          justify-center
          gap-2
          border-t
          border-[#8fae4a]/10
          pt-6
          text-sm
          text-[#66655a]
          "
        >

          <Sparkles
            size={14}
            className="text-[#d4af37]"
          />

          © 2026 BillSphere — v0.1.0


        </div>


      </div>


    </footer>
  );
}


export default Footer;