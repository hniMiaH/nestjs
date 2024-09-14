import { ApiProperty } from "@nestjs/swagger"

export class UpdateUserDto{
    @ApiProperty()
    firstName: string

    @ApiProperty()
    lastName: string

    @ApiProperty()
    password: string

    @ApiProperty()
    status: Active
}