import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import logo from "../../assets/logo.png";
import { ArrowUp } from "lucide-react";

const SERVICES = [
  { label: "New business filing", route: ROUTES.REGISTER },
  { label: "Permit renewal", route: ROUTES.LOGIN },
  { label: "Tax assessment", route: ROUTES.LOGIN },
  { label: "Business retirement", route: ROUTES.LOGIN },
];

export default function Footer() {
  return (
    <footer className="flex min-h-svh flex-col bg-zinc-950 text-zinc-400">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Official seal of Liliw, Laguna"
            className="h-10 w-10 object-contain"
          />
          <span className="text-base font-semibold tracking-tight text-white">
            Pamahalaang Bayan ng Liliw
          </span>
        </div>

        <h2 className="mt-10 max-w-2xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
          Apply for your business permit online
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed">
          The official business permits and licensing portal of the Municipality
          of Liliw, Laguna.
        </p>
        <Link
          to={ROUTES.REGISTER}
          className="mt-8 inline-flex w-fit rounded-lg bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition-all duration-200 ease-out hover:bg-zinc-200 active:scale-[0.98] motion-reduce:transition-none"
        >
          Apply online
        </Link>

        <div className="mt-20 grid gap-12 border-t border-zinc-800 pt-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Services</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {SERVICES.map((service) => (
                <li key={service.label}>
                  <Link
                    to={service.route}
                    className="text-sm transition-colors duration-200 hover:text-white"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Municipal office
            </h3>
            <address className="mt-5 flex flex-col gap-3 text-sm leading-relaxed not-italic">
              <p>M.H. del Pilar St., Liliw, 4004 Laguna</p>
              <a
                href="tel:+63495631201"
                className="transition-colors duration-200 hover:text-white"
              >
                (049) 563-1201
              </a>
              <a
                href="mailto:bplo@liliwlaguna.gov.ph"
                className="transition-colors duration-200 hover:text-white"
              >
                bplo@liliwlaguna.gov.ph
              </a>
            </address>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Office hours</h3>
            <p className="mt-5 text-sm leading-relaxed">
              Monday to Friday
              <br />
              8:00 AM to 5:00 PM
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-t border-zinc-800 py-7 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Pamahalaang Bayan ng Liliw. All rights
            reserved.
          </p>
          <a
            href="#hero"
            className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white"
          >
            Back to top
            <ArrowUp className="h-3 w-3 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none" />
          </a>
        </div>
      </div>
    </footer>
  );
}
