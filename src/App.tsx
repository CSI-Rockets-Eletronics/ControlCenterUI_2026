import { CommandSenderProvider } from "./components/commandSenderProvider";
import { ControlCenter } from "./components/controlCenter";
import { LaunchMachineProvider } from "./components/launchMachineProvider";

// eslint-disable-next-line import/no-default-export
export default function App() {
  return (
    <LaunchMachineProvider>
      <CommandSenderProvider>
        <ControlCenter />
      </CommandSenderProvider>
    </LaunchMachineProvider>
  );
}
