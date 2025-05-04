package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/lsi/netconf-aggregator/pkg/models"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
	_ backend.CallResourceHandler   = (*Datasource)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	config, err := models.LoadPluginSettings(settings)
	if err != nil {
		return nil, fmt.Errorf("error loading settings: %s", err.Error())
	}

	return &Datasource{
		settings: settings,
		config:   *config,
	}, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	settings backend.DataSourceInstanceSettings
	config   models.PluginSettings
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type queryModel struct {
	QueryText string `json:"queryText"`
	Constant  float64 `json:"constant"`
	Device    string `json:"device"`
}

func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	// create data frame response.
	// For an overview on data frames and how grafana handles them:
	// https://grafana.com/developers/plugin-tools/introduction/data-frames
	frame := data.NewFrame("response")

	// add fields.
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, []time.Time{query.TimeRange.From, query.TimeRange.To}),
		data.NewField("values", nil, []int64{10, 20}),
	)

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	config, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)

	backend.Logger.Debug("Config", "config", config)

	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	if config.Address == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Address is missing"
		return res, nil
	}

	//if config.Secrets.ApiKey == "" {
	//	res.Status = backend.HealthStatusError
	//	res.Message = "API key is missing"
	//	return res, nil
	//}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}

// Device represents the device information structure as returned by your API
type Device struct {
	ID     string `json:"id"`
	Server string `json:"server"`
	Port   int    `json:"port"`
}

// CallResource implements the backend.CallResourceHandler interface
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	backend.Logger.Debug("CallResource invoked", "path", req.Path)
	if req.Path == "devices" {
		backend.Logger.Debug("Calling getDevices handler")
		return d.getDevices(ctx, req, sender)
	}
	backend.Logger.Debug("Resource not found", "path", req.Path)
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusNotFound,
		Body:   []byte(`{"error": "Resource not found"}`),
	})
}

// getDevices handles the /devices endpoint
func (d *Datasource) getDevices(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	// Create a client to fetch data from your actual service
	backend.Logger.Debug("Datasource address", "address", d.config.Address)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	if d.config.Address == "" {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(`{"error": "Datasource address is not configured"}`),
		})
	}
	if !strings.HasPrefix(d.config.Address, "http://") && !strings.HasPrefix(d.config.Address, "https://") {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(`{"error": "Datasource address must include http:// or https://"}`),
		})
	}
	
	devicesURL := fmt.Sprintf("%s/devices", d.config.Address)
	
	// Make the request
	resp, err := client.Get(devicesURL)
	if err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(fmt.Sprintf(`{"error": "Failed to fetch devices: %s"}`, err.Error())),
		})
	}
	defer resp.Body.Close()
	
	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(fmt.Sprintf(`{"error": "Failed to read response: %s"}`, err.Error())),
		})
	}

	// Check if we got a successful response
	if resp.StatusCode != http.StatusOK {
		return sender.Send(&backend.CallResourceResponse{
			Status: resp.StatusCode,
			Body:   []byte(fmt.Sprintf(`{"error": "API returned status %d: %s"}`, resp.StatusCode, body)),
		})
	}
	
	// The response body should already be in the correct JSON format
	// Just pass it through

	// Send the response with the data we received from the API
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Headers: map[string][]string{
			"Content-Type": {"application/json"},
		},
		Body: body,
	})
}