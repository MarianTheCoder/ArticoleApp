import React, { useState, useRef, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

// ── Country definitions ───────────────────────────────────────────────────────
const COUNTRIES = [
    { code: "RO", name: "România", dialCode: "+40", flag: "🇷🇴", pattern: /^\+40/, format: "+40 ### ### ###" },
    { code: "MD", name: "Moldova", dialCode: "+373", flag: "🇲🇩", pattern: /^\+373/, format: "+373 ## ### ###" },
    { code: "FR", name: "Franța", dialCode: "+33", flag: "🇫🇷", pattern: /^\+33/, format: "+33 # ## ## ## ##" },
    { code: "GB", name: "Anglia", dialCode: "+44", flag: "🇬🇧", pattern: /^\+44/, format: "+44 #### ######" },
    { code: "OTHER", name: "Altul", dialCode: "+", flag: "🌍", pattern: null, format: null },
];

function detectCountry(value) {
    if (!value) return COUNTRIES[0];
    const v = value.startsWith("+") ? value : "+" + value;
    for (const c of COUNTRIES) {
        if (c.pattern && c.pattern.test(v)) return c;
    }
    return COUNTRIES.find(c => c.code === "OTHER");
}

function applyFormat(dialCode, digits, format) {
    if (!format) return dialCode + (digits ? " " + digits : "");
    let result = "";
    let di = 0;
    let inDialCode = true;
    for (let i = 0; i < format.length; i++) {
        const ch = format[i];
        if (inDialCode) {
            result += ch;
            if (result.trimEnd() === dialCode) inDialCode = false;
        } else {
            if (ch === "#") {
                if (di < digits.length) result += digits[di++];
                else break;
            } else {
                if (di < digits.length) result += ch;
            }
        }
    }
    return result;
}

function extractDigits(value, dialCode) {
    if (!value) return "";
    const stripped = value.replace(/\D/g, "");
    const dialDigits = dialCode.replace(/\D/g, "");
    if (stripped.startsWith(dialDigits)) return stripped.slice(dialDigits.length);
    return stripped;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PhoneInputCustom({
    value = "",
    onChange,
    placeholder = "Număr telefon",
    disabled = false,
    className = "",
    defaultCountry = "RO",
    fixedNumber = null, // New prop to prevent changes to the number
}) {
    const [country, setCountry] = useState(() => detectCountry(value));
    const [dropOpen, setDropOpen] = useState(false); // synced with Radix for chevron

    // Sync country on mount (for edit mode pre-fill)
    useEffect(() => {
        setCountry(detectCountry(fixedNumber) || COUNTRIES.find(c => c.code === defaultCountry));
    }, [fixedNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    const displayValue = () => {
        if (!value) {
            return country.code === "OTHER" ? "" : country.dialCode + " ";
        }
        if (country.code === "OTHER") return value;
        const digits = extractDigits(value, country.dialCode);
        return applyFormat(country.dialCode, digits, country.format);
    };

    const handleInput = (e) => {
        const raw = e.target.value;

        if (raw.startsWith("+")) {
            const detected = detectCountry(raw);
            if (detected.code !== "OTHER") {
                setCountry(detected);
                const digits = extractDigits(raw, detected.dialCode);
                onChange(applyFormat(detected.dialCode, digits, detected.format));
                return;
            }
        }

        if (country.code === "OTHER") { onChange(raw); return; }

        const onlyDigits = raw.replace(/\D/g, "");
        const dialDigits = country.dialCode.replace(/\D/g, "");
        let userDigits = onlyDigits.startsWith(dialDigits)
            ? onlyDigits.slice(dialDigits.length)
            : onlyDigits;

        const maxDigits = country.format ? (country.format.match(/#/g) || []).length : 15;
        userDigits = userDigits.slice(0, maxDigits);
        onChange(applyFormat(country.dialCode, userDigits, country.format));
    };

    const selectCountry = (c) => {
        setCountry(c);
        onChange(c.code === "OTHER" ? "+" : c.dialCode + " ");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Backspace" && country.code !== "OTHER") {
            const dialPrefix = country.dialCode + " ";
            if ((value || "").length <= dialPrefix.length) e.preventDefault();
        }
    };



    return (
        <div className={`flex h-10 rounded-md border border-input  ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}>

            {/* Country selector using Radix DropdownMenu */}
            <DropdownMenu onOpenChange={setDropOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 border-r border-input  transition text-sm shrink-0 rounded-l-md outline-none"
                    >
                        <span className="text-lg leading-none">{country.flag}</span>
                        <span className="text-sm text-muted-foreground font-mono">{country.dialCode}</span>
                        <FontAwesomeIcon icon={faChevronDown} className={`text-muted-foreground transform transition-transform duration-150 ${dropOpen ? "rotate-180" : ""}`} />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-44 p-1">
                    {COUNTRIES.map(c => (
                        <DropdownMenuItem
                            key={c.code}
                            onSelect={() => selectCountry(c)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer ${country.code === c.code ? "bg-accent font-medium" : ""}`}
                        >
                            <span className="text-lg">{c.flag}</span>
                            <span className="flex-1 text-foreground">{c.name}</span>
                            <span className="text-sm text-muted-foreground font-mono">{c.dialCode}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Phone number input */}
            <input
                type="tel"
                value={displayValue()}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 px-3 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0 rounded-r-md"
            />
        </div>
    );
}