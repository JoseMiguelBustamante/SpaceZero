"use client";
export type ChispaMood = "happy" | "alert" | "celebrate";
export function Chispa({ mood = "happy" }: { mood?: ChispaMood }) {
  return (
    <svg
      className={`chispa chispa-${mood}`}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Chispa ${mood === "alert" ? "sorprendido" : mood === "celebrate" ? "celebrando" : "feliz"}`}
      shapeRendering="crispEdges"
    >
      <path fill="#241d46" d="M10 10h28v3h4v23h-4v5H10v-5H6V13h4z" />
      <path fill="#ffd451" d="M12 12h24v3h4v19h-4v5H12v-5H8V15h4z" />
      <path fill="#fff0a2" d="M12 12h24v4H12zm-4 4h5v15H8z" />
      <path fill="#1e4258" d="M13 19h22v13H13z" />
      <g className="chispa-eyes" fill="#80fff2">
        {mood === "celebrate" ? (
          <path d="M15 23h3v-3h3v3h3v3h-3v-3h-3v3h-3zm11 0h3v-3h3v3h3v3h-3v-3h-3v3h-3z" />
        ) : (
          <>
            <path d="M16 22h5v6h-5zm12 0h5v6h-5z" />
            {mood === "happy" && <path d="M21 29h7v2h-7z" />}
          </>
        )}
      </g>
      <path
        fill="#a8a2df"
        d="M9 41h8v5H9zm22 0h8v5h-8zM2 23h4v10H2zm40 0h4v10h-4z"
      />
      <path fill="#f6a0c6" d="M22 5h4v7h-4z" />
      <path
        className="chispa-antenna"
        fill={mood === "alert" ? "#ff7e79" : "#7effc3"}
        d="M20 1h8v6h-8z"
      />
      {mood === "celebrate" && (
        <g fill="#fff298" className="chispa-spark">
          <path d="M0 5h4v4H0zm42-2h4v4h-4zM1 37h3v3H1zm43 3h4v4h-4z" />
        </g>
      )}
    </svg>
  );
}
