export default class GraphsComponent {
    constructor(element, historyDataSource, subscriptionDataSource) {
        this.container = element;
        this.config = this.configuration();
        this.historyDataSource = historyDataSource;
        this.subscriptionDataSource = subscriptionDataSource;
        this.data2 = {
            nodes: [],
            edges: []
        };
        this.network = null;
    }

    shortenText(text, maxCharCount = 10) {
        return (text && text.length > maxCharCount) ? `${text.substr(0, maxCharCount)}...` : text;
    }

    async init() {
        if (this.historyDataSource) {
            this.historyDataSource.setCallback(this.onHistoryData.bind(this));
        }
        this.initCheckboxes();

    }

    async onHistoryData(data) {
        try {
            if (!data || Object.keys(data).length === 0) {
                this.container.textContent = 'No Data. Response is empty';
                return;
            }

            const array = this.config.topElement(data);
            const addresses = new Set();
            const nodes = [];
            const edges = [];

            for (const pair of this.config.pairs) {
                const checkbox = document.getElementById(pair.checkboxId);

                if (data.EVM && data.EVM.Transfers && data.EVM.Transfers.length > 0) {
                    if (checkbox) {
                        checkbox.style.display = 'inline';
                    }
                } else {
                    if (checkbox) {
                        checkbox.style.display = 'none';
                        continue;
                    }

                }

                for (const rowData of array) {
                    if (checkbox && !checkbox.checked) continue;

                    const fromValue = pair.from.cell(rowData);
                    const toValue = pair.to.cell(rowData);

                    const fromLabel = pair.from.rendering ? await pair.from.rendering(fromValue).textContent : fromValue;
                    const toLabel = pair.to.rendering ? await pair.to.rendering(toValue).textContent : toValue;
                    const edgeLabel = pair.edgeLabel.cell(rowData);
                    const edgeLabelFormatted = pair.edgeLabel.rendering ? await pair.edgeLabel.rendering(edgeLabel).textContent : edgeLabel;

                    if (fromValue && !addresses.has(fromValue)) {
                        addresses.add(fromValue);
                        nodes.push({
                            id: fromValue,
                            label: this.shortenText(fromLabel),
                            url: `https://explorer.bitquery.io/${WidgetConfig.getNetwork(this.config.chainId(data))}/address/${fromValue}`
                        });
                    }

                    if (toValue && !addresses.has(toValue)) {
                        addresses.add(toValue);
                        nodes.push({
                            id: toValue,
                            label: this.shortenText(toLabel),
                            url: `https://explorer.bitquery.io/${WidgetConfig.getNetwork(this.config.chainId(data))}/address/${fromValue}`

                        });
                    }

                    if (edgeLabelFormatted.trim() !== '') {
                        const amount = pair.amount ? parseFloat(pair.amount.cell(rowData)) : 0;
                        edges.push({
                            from: fromValue,
                            to: toValue,
                            label: edgeLabelFormatted,
                            color: pair.color,
                            type: pair.name.toLowerCase().replace(' ', '-'),
                            font: {align: 'middle'},
                            smooth: {type: 'dynamic'},
                            value: amount
                        });
                    }
                }
            }

            this.data2 = {nodes, edges};
            this.network = new vis.Network(this.container, this.data2, this.getOptions());
            this.initNetworkEvents();

            this.network.on('click', (properties) => {
                const nodeId = properties.nodes[0];
                const edgeId = properties.edges[0];

                if (nodeId) {
                    const node = this.data2.nodes.find(node => node.id === nodeId);
                    if (node && node.url) {
                        window.open(node.url, '_blank');
                    }
                } else if (edgeId) {
                    const edge = this.data2.edges.find(edge => edge.id === edgeId);
                    if (edge && edge.url) {
                        window.open(edge.url, '_blank');
                    }
                }
            });
        } catch (error) {
            this.displayError(`Error processing data: ${error.message}`)
        }
    }

    updateGraph() {
        if (!this.data2 || !this.data2.edges) return;

        let filteredEdges = [];
        for (const pair of this.config.pairs) {
            const checkbox = document.getElementById(pair.checkboxId);
            if (!checkbox || (checkbox && checkbox.checked)) {
                filteredEdges = [...filteredEdges, ...this.data2.edges.filter(edge => edge.type === pair.name.toLowerCase().replace(' ', '-'))];
            }
        }

        const connectedNodeIds = new Set();
        filteredEdges.forEach(edge => {
            connectedNodeIds.add(edge.from);
            connectedNodeIds.add(edge.to);
        });

        const filteredNodes = this.data2.nodes.filter(node => connectedNodeIds.has(node.id));
        this.network.setOptions({physics: false});
        this.network.setData({
            nodes: this.data2.nodes,
            edges: filteredEdges
        });
        setTimeout(() => {
            this.network.setOptions({physics: true});
        }, 100);
    }


    initCheckboxes() {
        for (const pair of this.config.pairs) {
            const checkbox = document.getElementById(pair.checkboxId);

            if (checkbox) {
                checkbox.addEventListener("change", () => this.updateGraph());
            }
        }
    }

    initNetworkEvents() {
        if (!this.network) return;
        this.network.on('dragStart', () => this.network.setOptions({physics: false}));
        this.network.on('dragEnd', (params) => {
            this.network.setOptions({physics: true});

            if (params.nodes && params.nodes.length === 1) {
                let nodeId = params.nodes[0];
                let updatedNode = this.network.body.data.nodes.get(nodeId);
                updatedNode.physics = false;
                this.network.body.data.nodes.update(updatedNode);
            }
        });


        this.tooltip = document.createElement('div');
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.display = 'none';
        this.tooltip.style.background = 'inherit';
        this.tooltip.style.border = '1px solid #9AA1A6';
        this.tooltip.style.padding = '5px';
        this.tooltip.style.borderRadius = '5px';
        // this.tooltip.classList.add('tooltip-graph')

        document.body.appendChild(this.tooltip);


        this.network.on('hoverNode', (params) => {
            const node = this.data2.nodes.find(node => node.id === params.node);
            if (node && node.url) {
                const nodePosition = this.network.getPositions([params.node])[params.node];
                const canvasDOMPosition = this.network.canvasToDOM(nodePosition);

                const rect = this.container.getBoundingClientRect();

                const x = canvasDOMPosition.x + rect.left + window.scrollX;
                const y = canvasDOMPosition.y + rect.top + window.scrollY;

                this.tooltip.innerHTML = node.url;
                this.tooltip.style.left = (x + 20) + 'px';
                this.tooltip.style.top = (y + 20) + 'px';
                this.tooltip.style.display = 'block';
            }
        });



        this.network.on('blurNode', () => {
            this.tooltip.style.display = 'none';
        });
    }


    getOptions() {
        return {
            autoResize: true,
            height: '500px',
            width: '100%',
            interaction:{hover:true},
            edges: {arrows: 'to'},
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -4000,
                    centralGravity: 0.05,
                    springLength: 95,
                    springConstant: 0.01,
                }
            },
            edges: {
                arrows: 'to',
                scaling: {
                    label: {
                        enabled: true,
                    },
                    customScalingFunction: function (min, max, total, value) {
                        if (max === min) {
                            return 0.5;
                        } else {
                            const scale = 1 / (max - min);
                            return Math.max(0,(value - min)*scale);
                        }
                    },
                    min: 1,
                    max: 10
                }
            }
        };
    }

    displayError(message) {
        this.container.textContent = ''
        const errorDiv = document.createElement('div')
        errorDiv.classList.add('alert', 'alert-danger')
        errorDiv.textContent = message
        this.container.appendChild(errorDiv)
    }
}
