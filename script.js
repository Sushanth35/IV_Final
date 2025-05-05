let data;
const tooltip = d3.select("#tooltip");

// Zoom settings
let pieChartZoom = 1;
const zoomIncrement = 0.1;
let pieChartScale;
let pieChartArc;

// Load data
d3.csv("a1-grocerystoresurvey.csv").then(rawData => {
  data = rawData;
  data.forEach(d => {
    d.Age = +d.Age;
    d.Income = +d.Income;
    d.PurchaseAmount = +d.PurchaseAmount;
    d.FamilySize = +d.FamilySize;
  });
  initFilters();
  updateVisuals();
}).catch(err => {
  console.error("Error loading CSV file: ", err); 
  alert("Error loading the data. Please check the file path.");
});

function initFilters() {
  let genders = Array.from(new Set(data.map(d => d.Gender)));
  genders.forEach(g => d3.select("#genderFilter").append("option").attr("value", g).text(g));
  let payments = Array.from(new Set(data.map(d => d.PaymentMethod)));
  payments.forEach(p => d3.select("#paymentFilter").append("option").attr("value", p).text(p));
  let chains = Array.from(new Set(data.map(d => d.Chain)));
  chains.forEach(c => d3.select("#chainFilter").append("option").attr("value", c).text(c));
  d3.selectAll("select").on("change", updateVisuals);
}

function filterData() {
  let gender = d3.select("#genderFilter").property("value");
  let payment = d3.select("#paymentFilter").property("value");
  let chain = d3.select("#chainFilter").property("value");
  return data.filter(d =>
    (gender === "All" || d.Gender === gender) &&
    (payment === "All" || d.PaymentMethod === payment) &&
    (chain === "All" || d.Chain === chain)
  );
}

function showNoData(containerId) {
  d3.select(`#${containerId}`).html('<div class="no-data">No data available</div>');
}

function updateVisuals() {
  let filtered = filterData();
  drawBarChart(filtered);
  drawPieChart(filtered);
  drawBoxPlot(filtered);
}

function drawBarChart(filtered) {
  const id = "barChart";
  d3.select(`#${id}`).html(""); 
  if (filtered.length === 0) { showNoData(id); return; }

  const svg = d3.select(`#${id}`).append("svg"),
        margin = {top: 20, right: 20, bottom: 50, left: 50},
        width = svg.node().clientWidth - margin.left - margin.right,
        height = svg.node().clientHeight - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const avgPurchase = d3.rollup(filtered, v => d3.mean(v, d => d.PurchaseAmount), d => d.Chain);
  
  const x = d3.scaleLinear().domain([0, d3.max(avgPurchase.values())]).nice().range([0, width]);
  const y = d3.scaleBand().domain(Array.from(avgPurchase.keys())).range([0, height]).padding(0.3);

  const color = "#4FC3F7"; 

  g.selectAll("rect")
    .data(Array.from(avgPurchase))
    .join("rect")
    .attr("x", 0)
    .attr("y", d => y(d[0]))
    .attr("width", d => x(d[1]))
    .attr("height", y.bandwidth())
    .attr("fill", color)  
    .on("mouseover", (event, d) => {
      d3.select(event.target).attr("fill", "#FF7043"); 
      tooltip.style("opacity", 1).html(`<b>Chain:</b> ${d[0]}<br><b>Avg Purchase:</b> $${d[1].toFixed(2)}`);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", (event) => {
      d3.select(event.target).attr("fill", color); 
      tooltip.style("opacity", 0);
    });

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2 + margin.left)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Average Purchase by Chain");
}

function drawPieChart(filtered) {
  const id = "pieChart";
  d3.select(`#${id}`).html(""); 
  if (filtered.length === 0) { showNoData(id); return; }

  const svg = d3.select(`#${id}`).append("svg"),
        width = svg.node().clientWidth,
        height = svg.node().clientHeight,
        radius = Math.min(width, height) / 2 - 20,
        g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

  const genderCounts = d3.rollup(filtered, v => v.length, d => d.Gender);
  const pie = d3.pie().value(d => d[1]);
  pieChartArc = d3.arc().innerRadius(0).outerRadius(radius * pieChartZoom); 
  pieChartScale = d3.scaleOrdinal()
                  .domain(Array.from(genderCounts.keys()))
                  .range(["#9C27B0", "#FF9800"]);  

  g.selectAll("path")
    .data(pie(Array.from(genderCounts)))
    .join("path")
    .attr("d", pieChartArc)
    .attr("fill", (d, i) => pieChartScale(d.data[0]))
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(`<b>Gender:</b> ${d.data[0]}<br><b>Count:</b> ${d.data[1]}`);
      d3.select(event.target).transition().duration(200).attr("transform", "scale(1.1)"); 
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", (event) => {
      tooltip.style("opacity", 0);
      d3.select(event.target).transition().duration(200).attr("transform", "scale(1)"); 
    });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Gender Distribution");
}

// Zoom In and Zoom Out Functions for Pie Chart
function zoomInPieChart() {
    pieChartZoom += zoomIncrement;
    drawPieChart(filterData());
}

function zoomOutPieChart() {
    pieChartZoom -= zoomIncrement;
    if (pieChartZoom < zoomIncrement) pieChartZoom = zoomIncrement; 
    drawPieChart(filterData());
}

// Box Plot function with Interchanged X and Y axes and hover interaction and outliers
function drawBoxPlot(filtered) {
  const id = "boxPlot";
  d3.select(`#${id}`).html(""); 
  if (filtered.length === 0) { showNoData(id); return; }

  const svg = d3.select(`#${id}`).append("svg"),
        margin = {top: 20, right: 20, bottom: 50, left: 50},
        width = svg.node().clientWidth - margin.left - margin.right,
        height = svg.node().clientHeight - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const chainGroups = d3.groups(filtered, d => d.Chain);

  const x = d3.scaleBand()
    .domain(chainGroups.map(d => d[0]))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filtered, d => d.PurchaseAmount)])
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  const boxWidth = x.bandwidth();

  chainGroups.forEach(([chain, group]) => {
    const q1 = d3.quantile(group.map(d => d.PurchaseAmount).sort(d3.ascending), 0.25);
    const median = d3.quantile(group.map(d => d.PurchaseAmount).sort(d3.ascending), 0.5);
    const q3 = d3.quantile(group.map(d => d.PurchaseAmount).sort(d3.ascending), 0.75);
    const iqr = q3 - q1;
    const lowerWhisker = Math.max(d3.min(group.map(d => d.PurchaseAmount)), q1 - 1.5 * iqr);
    const upperWhisker = Math.min(d3.max(group.map(d => d.PurchaseAmount)), q3 + 1.5 * iqr);

    g.append("rect")
      .attr("x", x(chain))
      .attr("y", y(q3))
      .attr("width", boxWidth)
      .attr("height", y(q1) - y(q3))
      .attr("fill", "#4FC3F7")
      .on("mouseover", () => {
        tooltip.style("opacity", 1).html(`<b>Chain:</b> ${chain}<br><b>Q1:</b> ${q1.toFixed(2)}<br><b>Median:</b> ${median.toFixed(2)}<br><b>Q3:</b> ${q3.toFixed(2)}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    g.append("line")
      .attr("x1", x(chain))
      .attr("x2", x(chain) + boxWidth)
      .attr("y1", y(median))
      .attr("y2", y(median))
      .attr("stroke", "#FF7043")
      .attr("stroke-width", 2);

    g.append("line")
      .attr("x1", x(chain) + boxWidth / 2)
      .attr("x2", x(chain) + boxWidth / 2)
      .attr("y1", y(lowerWhisker))
      .attr("y2", y(q1))
      .attr("stroke", "#FF7043")
      .attr("stroke-width", 2);

    g.append("line")
      .attr("x1", x(chain) + boxWidth / 2)
      .attr("x2", x(chain) + boxWidth / 2)
      .attr("y1", y(upperWhisker))
      .attr("y2", y(q3))
      .attr("stroke", "#FF7043")
      .attr("stroke-width", 2);

    // Outlier points
    const outliers = group.filter(d => d.PurchaseAmount < lowerWhisker || d.PurchaseAmount > upperWhisker);
    g.selectAll(".outlier")
      .data(outliers)
      .join("circle")
      .attr("cx", x(chain) + boxWidth / 2)
      .attr("cy", d => y(d.PurchaseAmount))
      .attr("r", 5)
      .attr("fill", "#FF7043")
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1).html(`<b>Outlier Value:</b> ${d.PurchaseAmount.toFixed(2)}<br><b>Chain:</b> ${chain}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  });

  svg.append("text")
    .attr("x", width / 2 + margin.left)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Purchase Amount Distribution by Chain");
}

// Reset Filters
function resetFilters() {
  d3.select("#genderFilter").property("value", "All");
  d3.select("#paymentFilter").property("value", "All");
  d3.select("#chainFilter").property("value", "All");
  updateVisuals();
}
