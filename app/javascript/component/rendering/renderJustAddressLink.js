export default function renderJustAddressLink(data, variables, chainId) {
  const div = document.createElement('div');
  div.classList.add('text-truncate');
  const link = document.createElement('a');
  link.setAttribute('target', '_blank');
  link.href = `${process.env.EXPLORER_URL}/${WidgetConfig.getNetwork(chainId)}/address/${data}`;
  link.textContent = data;

  div.appendChild(link);
  return div;
}
