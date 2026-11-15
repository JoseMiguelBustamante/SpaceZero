import { GameProvider } from "@/components/GameProvider";
import { IsometricGame } from "@/components/world/IsometricGame";
export default function Home() {
  return (
    <GameProvider>
      <IsometricGame />
    </GameProvider>
  );
}
