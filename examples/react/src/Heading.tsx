interface HeadingProps {
  href: string;
  text: string;
}

function Heading({ href, text }: HeadingProps) {
  return (
    <div>
      <h1>
        <a
          style={{
            textDecoration: "none",
            color: "#635e5e",
          }}
          href={href}
        >
          {text}
        </a>
      </h1>
      <hr />
    </div>
  );
}

export default Heading;
