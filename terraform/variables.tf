variable "location" {
  type    = string
  default = "westeurope"
}

variable "env" {
  type    = string
  default = "prototype"
}

variable "pg_admin_user" {
  type    = string
  default = "lawrenceadmin"
}

variable "pg_admin_password" {
  type      = string
  sensitive = true
}
