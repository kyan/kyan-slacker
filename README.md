# Slacker

An API that merges Harvest and Timetastic data and currently gives a basic
output:

```json
{
  "date": "2022-10-14",
  "users": [
    {
      "needsReminding": false,
      "timetastic_id": 123456,
      "email": "foo@home.com",
      "first_name": "Fred",
      "last_name": "Spanner",
      "harvest_id": 654321,
      "timeEntry": {
        "spent_date": "2022-10-14",
        "hours": 0.5,
        "notes": "Devops meeting",
        "user": {
          "id": 654321,
          "name": "Fred Spanner"
        }
      }
    }
  ]
}
```

Which can be used to show who looks like the should have logged time but forgot.

# usage

Run locally with `deno task dev`

# deployment

This is a perfect project to run on https://deno.com/deploy.
