import CommandSenderProvider from "./components/commandSenderProvider";
import GoPoll from "./components/goPoll";
import LaunchMachineProvider from "./components/launchMachineProvider";

export default function App() {
  return (
    <LaunchMachineProvider>
      <CommandSenderProvider>
        <div className="h-full">
          <GoPoll />
        </div>
      </CommandSenderProvider>
    </LaunchMachineProvider>
  );
}
