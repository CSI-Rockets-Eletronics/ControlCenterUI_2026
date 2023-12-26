import {
  type ChangeEvent,
  type FormEvent,
  memo,
  useCallback,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/design/button";
import { Panel } from "@/components/design/panel";
import { DEFAULT_SERVER } from "@/lib/stationInterface";

export const Root = memo(function Root() {
  const navigate = useNavigate();

  const [environmentKey, setEnvironmentKey] = useState("");
  const [server, setServer] = useState("");

  const handleEnvironmentKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEnvironmentKey(event.target.value);
    },
    [],
  );

  const handleServerChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setServer(event.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      navigate({
        pathname: `/${environmentKey}`,
        search: server ? `?server=${encodeURIComponent(server)}` : undefined,
      });
    },
    [navigate, environmentKey, server],
  );

  return (
    <div className="flex items-center justify-center h-full p-4 scrollable">
      <Panel className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="text-gray-text">
            Enter an Environment Key:
            <input
              className="block w-full px-3 py-2 mt-2 font-mono text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover bg-gray-el-bg border-gray-border"
              type="text"
              spellCheck={false}
              value={environmentKey}
              onChange={handleEnvironmentKeyChange}
            />
          </label>

          <label className="text-gray-text">
            Enter an Server (Optional):
            <input
              className="block w-full px-3 py-2 mt-2 font-mono text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover bg-gray-el-bg border-gray-border"
              type="text"
              spellCheck={false}
              placeholder={DEFAULT_SERVER}
              value={server}
              onChange={handleServerChange}
            />
          </label>

          <Button
            type="submit"
            color="green"
            disabled={environmentKey.length === 0}
          >
            GO
          </Button>
        </form>
      </Panel>
    </div>
  );
});
