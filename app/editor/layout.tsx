import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

export const metadata = {
  title: "SceneBook Editor",
  description: "Full-screen video editor for SceneBook",
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="editor h-screen w-screen overflow-hidden">{children}</div>;
}
