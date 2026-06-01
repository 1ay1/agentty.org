import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code of Conduct",
  description: "The Contributor Covenant Code of Conduct for the agentty community.",
  alternates: { canonical: "/code-of-conduct" },
};

export default function CodeOfConduct() {
  return (
    <div className="page">
      <h1>Code of Conduct</h1>
      <p className="lead">
        We adopt the Contributor Covenant. Our community is welcoming, harassment-free, and
        focused on building good software together.
      </p>

      <h2>Our pledge</h2>
      <p>
        We as members, contributors, and leaders pledge to make participation in our
        community a harassment-free experience for everyone, regardless of age, body size,
        visible or invisible disability, ethnicity, sex characteristics, gender identity and
        expression, level of experience, education, socio-economic status, nationality,
        personal appearance, race, religion, or sexual identity and orientation.
      </p>

      <h2>Our standards</h2>
      <p>Examples of behavior that contributes to a positive environment:</p>
      <ul>
        <li>Demonstrating empathy and kindness toward other people.</li>
        <li>Being respectful of differing opinions, viewpoints, and experiences.</li>
        <li>Giving and gracefully accepting constructive feedback.</li>
        <li>Accepting responsibility and apologizing to those affected by our mistakes.</li>
        <li>Focusing on what is best for the overall community.</li>
      </ul>
      <p>Examples of unacceptable behavior:</p>
      <ul>
        <li>Sexualized language or imagery, and unwelcome sexual attention or advances.</li>
        <li>Trolling, insulting or derogatory comments, and personal or political attacks.</li>
        <li>Public or private harassment.</li>
        <li>Publishing others&apos; private information without explicit permission.</li>
        <li>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
      </ul>

      <h2>Enforcement</h2>
      <p>
        Instances of abusive, harassing, or otherwise unacceptable behavior may be reported
        to the maintainers via a GitHub private security advisory or direct contact. All
        complaints will be reviewed and investigated promptly and fairly. Maintainers are
        obligated to respect the privacy and security of the reporter.
      </p>

      <h2>Attribution</h2>
      <p>
        This Code of Conduct is adapted from the{" "}
        <a href="https://www.contributor-covenant.org/version/2/1/code_of_conduct.html" target="_blank" rel="noopener noreferrer">
          Contributor Covenant, version 2.1
        </a>.
      </p>
    </div>
  );
}
