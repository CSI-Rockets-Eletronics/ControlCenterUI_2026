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

export const Root = memo(function Root() {
  const navigate = useNavigate();

  const [stationId, setStationId] = useState("");

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setStationId(event.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      navigate(`/${stationId}`);
    },
    [navigate, stationId],
  );

  return (
    <div className="flex items-center justify-center h-full p-4 scrollable">
      <Panel className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-gray-text">
            Enter a Station ID:
            <input
              className="block w-full px-3 py-2 mt-2 font-mono text-sm border-2 outline-none rounded-md focus:ring ring-yellow-border-hover bg-gray-el-bg border-gray-border"
              type="text"
              spellCheck={false}
              value={stationId}
              onChange={handleInputChange}
            />
          </label>
          <Button type="submit" color="green" disabled={stationId.length === 0}>
            GO
          </Button>
        </form>
      </Panel>
    </div>
  );
});
