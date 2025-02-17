import {
	getBaseClass,
	getAPIButton,
	streamControl,
	switchDataset,
	getQueryParams,
	createWidgetFrame,
	HistoryDataSource,
	increaseLimitButton,
	SubscriptionDataSource
} from "./helper";

export default async function renderComponent(components, historyQueryID, explorerVariables = {}, subscriptionQueryID) {

	let variables, subscriptionDataSource, historyDataSource, subscriptionQueryParams, historyQueryParams

	if (subscriptionQueryID) {
		subscriptionQueryParams = await getQueryParams(subscriptionQueryID)
		const { endpoint_url, query, variables: rawVariables } = subscriptionQueryParams
		variables = { ...rawVariables, ...explorerVariables };
		const subscriptionPayload = { query, variables, endpoint_url }
		subscriptionDataSource = new SubscriptionDataSource(subscriptionPayload)
	}
	if (historyQueryID) {
		historyQueryParams = await getQueryParams(historyQueryID)
		variables = variables || { ...historyQueryParams.variables, ...explorerVariables }
		const historyPayload = {
			variables,
			query: historyQueryParams.query,
			endpoint_url: historyQueryParams.endpoint_url
		}
		historyDataSource = new HistoryDataSource(historyPayload)
	}

	components.forEach(async component => {
		const ComponentConstructor = component[0]
		const componentSelector = component[1]
		document.querySelector(componentSelector).textContent = ''
		const widgetFrame = createWidgetFrame(componentSelector, subscriptionQueryID, historyQueryID)
		if (subscriptionDataSource) {
			widgetFrame.onloadmetadata(subscriptionQueryParams)
			subscriptionDataSource.setWidgetFrame(widgetFrame)
		}
		if (historyDataSource) {
			widgetFrame.onloadmetadata(historyQueryParams)
			historyDataSource.setWidgetFrame(widgetFrame)
		}
		const componentObject = new ComponentConstructor(widgetFrame.frame, historyDataSource, subscriptionDataSource)
		componentObject.init(widgetFrame)
		widgetFrame.onchangetitle(componentObject.config.title)
		const data = getBaseClass(ComponentConstructor, componentObject.config);
		data.unshift({ [WidgetConfig.name]: serialize(WidgetConfig) });
		widgetFrame.getStreamingAPIButton.onclick = getAPIButton(data, variables, subscriptionQueryID)
		widgetFrame.getHistoryAPIButton.onclick = getAPIButton(data, variables, historyQueryID)
		widgetFrame.showMoreButton.onclick = increaseLimitButton(historyDataSource)
		widgetFrame.switchButton.onclick = switchDataset(widgetFrame, historyDataSource, subscriptionDataSource)
		widgetFrame.streamControlButton.onclick = streamControl(subscriptionDataSource)
	})

	historyDataSource && historyDataSource.changeVariables()
}
