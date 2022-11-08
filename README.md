# Slacker

An API that merges Harvest and Timetastic data and currently gives a basic
output:

You can now use params: `start_date` and `end_date` to get a batch of results

```json
{
  "dates": {
    "2022-12-01": {
      "users": [
        {
          "needsReminding": true,
          "timetastic_id": 12355,
          "email": "foo@kyan.com",
          "first_name": "Foo",
          "last_name": "Bar",
          "harvest_id": 6876876,
          "timeEntries": []
        },
        {
          "needsReminding": true,
          "timetastic_id": 876876,
          "email": "bar@kyan.com",
          "first_name": "Bar",
          "last_name": "Bas",
          "harvest_id": 878768,
          "timeEntries": []
        }
      ]
    }
  }
}
```

Which can be used to show who looks like the should have logged time but forgot.

# usage

Run locally with `deno task dev`

# deployment

This is a perfect project to run on https://deno.com/deploy.
