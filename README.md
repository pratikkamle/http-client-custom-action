# HTTP Client Custom Action

This action will do HTTP operations.

## Inputs

### `url`
**Required** The URL endpoint to send the HTTP request to.
### `method`
**Required** The HTTP method for the request
### `customHeaders`
**Required** The headers to include in the request (in JSON format)
### `data`


## Outputs

### `time`
The time HTTP request was made.

### `response`
The response body received from the POST request

### `headers`
The headers received in the response

## Example usage

```yaml
- name: HTTP Client Custom Action
  id: httpclient
  uses: pratikkamle/http-client-custom-action@v1.0.1
  with:
    url: 'https://enp7gmdcs56pb.x.pipedream.net/'
    method: 'POST'
    customHeaders: '{"Content-Type": "application/json"}'
    data: '{"Custom action Job status": "Success"}'
- name: Get the response output
  run: |
    echo ${{ steps.hello.outputs.response }}
    echo ${{ steps.hello.outputs.headers }}
```
