import { AppLayout } from "./components/layout/AppLayout.tsx";
import { HomePage } from "./pages/Home.tsx";

export default function App() {
  return (
    <AppLayout>
      <div className="stack-gap">
        <HomePage />
      </div>
    </AppLayout>
  );
}
