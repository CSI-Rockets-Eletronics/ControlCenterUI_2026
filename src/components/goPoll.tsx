function Entry({ pass, children }: { pass: boolean; children: string }) {
  return (
    <div>
      <p>{children}</p>
    </div>
  );
}

export default function goPoll() {
  return (
    <div>
      <p>GO/NO GO POLL</p>
      <Entry pass={false}>SAFETY OFFICER 1</Entry>
      <Entry pass={false}>SAFETY OFFICER 2</Entry>
      <Entry pass={false}>ADVISER</Entry>
      <Entry pass={false}>PROP LEAD</Entry>
      <Entry pass={false}>ELEC LEAD</Entry>
      <p>0/5 GO</p>
    </div>
  );
}
