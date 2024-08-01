document
  .getElementById("login-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const jwt = await fetchJWT(username, password);
      const graphQLData = await fetchGraphQLData(jwt);

      // Assuming the data needs to be formatted
      const formattedData = graphQLData.map((item) => ({
        date: item.createdAt.split("T")[0],
        // Adjust based on your data structure
        value: item.amount,
        // Adjust based on your data structure
      }));

      displayLineChart("#line-chart", formattedData);
      document.getElementById("login-container").style.display = "none";
      document.getElementById("content").style.display = "block";
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });

async function fetchJWT(username, password) {
  const response = await fetch("https://learn.01founders.co/api/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  return data.token; // assuming the token is in `data.token`
}

async function fetchGraphQLData(jwt) {
  const query = `
                query {
                    transaction {
                        id
                        type
                        amount
                        objectId
                        userId
                        createdAt
                        path
                    }
                }
            `;

  const response = await fetch("https://learn.01founders.co/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return data.data.transaction; // adjust based on the actual query structure
}

async function displayLineChart(containerSelector, data) {
  const container = d3.select(containerSelector);
  container.html("");

  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Assuming data has a date field and a value field
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach((d) => (d.date = parseDate(d.date)));

  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .range([height, 0]);

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.value));

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%y-%m-%d")).ticks(6));

  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  // Create tooltip element
  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // Add circles for data points and attach tooltip events
  svg
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.value))
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Value: ${d.value}`)
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });
}
