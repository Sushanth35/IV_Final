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

// Zoom In
